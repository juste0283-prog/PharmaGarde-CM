import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  STATUS_META,
  type City,
  type Pharmacy,
  type Position,
  type QuartierPoint,
  type ReliabilityStatus,
} from '../data/pharmacies'

const STATUS_DOT: Record<ReliabilityStatus, string> = {
  confirmee: '#059669',
  verifiee: '#0284c7',
  ancienne: '#d97706',
  'a-verifier': '#e11d48',
}

const CAMEROON_CENTER: L.LatLngTuple = [6.6, 12.2]

interface PharmacyMapProps {
  pharmacies: Pharmacy[]
  allCities: City[]
  quartierPoints: QuartierPoint[]
  position: Position | null
  routeTarget: Pharmacy | null
  city: City | undefined
  onDirections: (pharmacy: Pharmacy) => void
  onSelectCity: (cityName: string) => void
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function haversineKm(a: Position, b: Position): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const radiusKm = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * radiusKm * Math.asin(Math.sqrt(h))
}

function markerIcon(status: ReliabilityStatus, index: number): L.DivIcon {
  return L.divIcon({
    className: 'pg-marker',
    html: `<div class="pg-pin"><span>${index}</span><i style="background:${STATUS_DOT[status]}"></i></div>`,
    iconSize: [26, 30],
    iconAnchor: [13, 28],
    popupAnchor: [0, -26],
  })
}

const userIcon = L.divIcon({
  className: 'pg-marker',
  html: `<div class="pg-user"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
})

const quartierIcon = L.divIcon({
  className: 'pg-marker',
  html: `<div class="pg-quartier"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  tooltipAnchor: [10, -6],
})

function cityPopupElement(
  city: City,
  quartiers: string[],
  count: number,
  onSelectCity: (cityName: string) => void,
): HTMLElement {
  const div = document.createElement('div')
  div.className = 'pg-popup'
  div.innerHTML = `
    <div class="pg-popup-head">
      <strong>${escapeHtml(city.name)}</strong>
      <span class="pg-city-region">${escapeHtml(city.region)}</span>
    </div>
    <p class="pg-info">${count} pharmacie${count > 1 ? 's' : ''} de garde</p>
    <p class="pg-info pg-popup-quartiers">
      Quartiers : ${quartiers.length > 0 ? quartiers.map(escapeHtml).join(', ') : '—'}
    </p>
  `
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'pg-btn-nav'
  button.textContent = 'Voir les pharmacies'
  button.addEventListener('click', () => onSelectCity(city.name))
  div.appendChild(button)
  return div
}

function popupHtml(
  pharmacy: Pharmacy,
  routeDistanceKm: number | null,
  fromCenter: boolean,
): string {
  const meta = STATUS_META[pharmacy.status]
  const phone = pharmacy.phone.replace(/\s/g, '')
  const distance =
    pharmacy.distanceKm !== null
      ? `<p class="pg-info">Distance de vous : ${pharmacy.distanceKm.toLocaleString('fr-FR')} km</p>`
      : ''
  const route =
    routeDistanceKm !== null
      ? `<p class="pg-route-info">Itinéraire — à vol d'oiseau : ${routeDistanceKm.toLocaleString('fr-FR')} km${
          fromCenter ? ' (depuis le centre-ville)' : ''
        }</p>`
      : ''
  return `
    <div class="pg-popup">
      <div class="pg-popup-head">
        <strong>${escapeHtml(pharmacy.name)}</strong>
        <span class="${meta.badge}">${meta.label}</span>
      </div>
      <p class="pg-info">Quartier ${escapeHtml(pharmacy.quartier)} — ${escapeHtml(pharmacy.address)}</p>
      <p class="pg-info">${escapeHtml(pharmacy.currentGarde)}</p>
      <p class="pg-info">Fiabilité : ${escapeHtml(pharmacy.lastUpdated)}</p>
      ${distance}
      ${route}
      <div class="pg-actions">
        <a href="tel:${phone}">Appeler</a>
        <button type="button" class="pg-btn-nav">Itinéraire</button>
      </div>
      <a class="pg-external" href="https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}" target="_blank" rel="noopener noreferrer">
        Ouvrir dans Google Maps ↗
      </a>
    </div>
  `
}

export default function PharmacyMap({
  pharmacies,
  allCities,
  quartierPoints,
  position,
  routeTarget,
  city,
  onDirections,
  onSelectCity,
}: PharmacyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.FeatureGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      maxZoom: 17,
    }).setView(CAMEROON_CENTER, 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    markersRef.current = L.featureGroup().addTo(map)
    mapRef.current = map
    const frame = requestAnimationFrame(() => map.invalidateSize())
    return () => {
      cancelAnimationFrame(frame)
      map.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const group = markersRef.current
    if (!map || !group) return

    group.clearLayers()

    if (position !== null) {
      L.marker([position.lat, position.lng], { icon: userIcon })
        .addTo(group)
        .bindPopup('<div class="pg-popup"><p class="pg-info">Votre position</p></div>')
    }

    allCities.forEach((c) => {
      const cityQuartiers = quartierPoints
        .filter((q) => q.city === c.name)
        .map((q) => q.quartier)
      const count = pharmacies.filter((p) => p.city === c.name).length
      const marker = L.circleMarker([c.lat, c.lng], {
        radius: 9,
        color: '#065f46',
        weight: 2,
        fillColor: '#059669',
        fillOpacity: 0.9,
      })
        .addTo(group)
        .bindTooltip(`${c.name} — ${c.region}`, { direction: 'top' })
        .bindPopup(cityPopupElement(c, cityQuartiers, count, onSelectCity))
      marker.on('click', () => marker.openPopup())
    })

    quartierPoints.forEach((q) => {
      L.marker([q.lat, q.lng], { icon: quartierIcon })
        .addTo(group)
        .bindTooltip(`${q.quartier} (${q.city})`, { direction: 'right' })
    })

    const fromCenter =
      position === null &&
      routeTarget !== null
        ? allCities.find((c) => c.name === routeTarget.city) !== undefined
        : false
    const routeDistanceKm =
      routeTarget === null
        ? 0
        : haversineKm(
            position ??
              {
                lat:
                  allCities.find((c) => c.name === routeTarget.city)?.lat ??
                  routeTarget.latitude,
                lng:
                  allCities.find((c) => c.name === routeTarget.city)?.lng ??
                  routeTarget.longitude,
              },
            { lat: routeTarget.latitude, lng: routeTarget.longitude },
          )

    const targetMarkers: L.Marker[] = []
    pharmacies.forEach((pharmacy, index) => {
      const marker = L.marker([pharmacy.latitude, pharmacy.longitude], {
        icon: markerIcon(pharmacy.status, index + 1),
      })
      marker.bindPopup(
        popupHtml(
          pharmacy,
          routeTarget?.id === pharmacy.id ? routeDistanceKm : null,
          routeTarget?.id === pharmacy.id ? fromCenter : false,
        ),
      )
      marker.on('popupopen', () => {
        const button = marker.getPopup()?.getElement()?.querySelector<HTMLButtonElement>('.pg-btn-nav')
        if (button) button.onclick = () => onDirections(pharmacy)
      })
      marker.on('click', () => marker.openPopup())
      group.addLayer(marker)
      if (routeTarget?.id === pharmacy.id) targetMarkers.push(marker)
    })

    if (routeTarget !== null) {
      const origin = position ?? {
        lat: allCities.find((c) => c.name === routeTarget.city)?.lat ?? routeTarget.latitude,
        lng: allCities.find((c) => c.name === routeTarget.city)?.lng ?? routeTarget.longitude,
      }
      const destination: L.LatLngTuple = [routeTarget.latitude, routeTarget.longitude]
      L.polyline(
        [
          [origin.lat, origin.lng],
          destination,
        ],
        { color: '#047857', weight: 4, opacity: 0.85, dashArray: '8 8' },
      ).addTo(group)
      if (position === null) {
        L.circleMarker([origin.lat, origin.lng], {
          radius: 10,
          color: '#047857',
          weight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.9,
        })
          .addTo(group)
          .bindTooltip('Centre-ville (départ)', { direction: 'top' })
      }
      targetMarkers.forEach((marker) => marker.openPopup())
      map.fitBounds(
        [
          [origin.lat, origin.lng],
          destination,
        ],
        { padding: [60, 60], maxZoom: 16 },
      )
    } else if (pharmacies.length > 0) {
      map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 15 })
    } else if (city) {
      map.setView([city.lat, city.lng], 13)
    } else {
      map.setView(CAMEROON_CENTER, 6)
    }
  }, [pharmacies, allCities, quartierPoints, position, routeTarget, city, onDirections, onSelectCity])

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full rounded-2xl sm:h-[520px]"
      role="application"
      aria-label="Carte des pharmacies de garde — toutes les villes et quartiers"
    />
  )
}