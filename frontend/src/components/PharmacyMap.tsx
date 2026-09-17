import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  STATUS_META,
  type City,
  type Pharmacy,
  type Position,
  type ReliabilityStatus,
} from '../data/pharmacies'

const STATUS_DOT: Record<ReliabilityStatus, string> = {
  confirmee: '#059669',
  verifiee: '#0284c7',
  ancienne: '#d97706',
  'a-verifier': '#e11d48',
}

interface PharmacyMapProps {
  pharmacies: Pharmacy[]
  position: Position | null
  city: City
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

function popupHtml(pharmacy: Pharmacy): string {
  const meta = STATUS_META[pharmacy.status]
  const phone = pharmacy.phone.replace(/\s/g, '')
  const distance =
    pharmacy.distanceKm !== null
      ? `<p class="pg-info">Distance : ${pharmacy.distanceKm.toLocaleString('fr-FR')} km</p>`
      : ''
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`
  return `
    <div class="pg-popup">
      <div class="pg-popup-head">
        <strong>${escapeHtml(pharmacy.name)}</strong>
        <span class="${meta.badge}">${meta.label}</span>
      </div>
      <p class="pg-info">${escapeHtml(pharmacy.quartier)} — ${escapeHtml(pharmacy.address)}</p>
      <p class="pg-info">${escapeHtml(pharmacy.currentGarde)}</p>
      <p class="pg-info">Fiabilité : ${escapeHtml(pharmacy.lastUpdated)}</p>
      ${distance}
      <div class="pg-actions">
        <a href="tel:${phone}">Appeler</a>
        <a href="${directions}" target="_blank" rel="noopener noreferrer">Itinéraire</a>
      </div>
    </div>
  `
}

export default function PharmacyMap({ pharmacies, position, city }: PharmacyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.FeatureGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      [city.lat, city.lng],
      14,
    )
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
    // Intent : la carte n'est créée qu'une seule fois (le recentrage est géré ci-dessous).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    pharmacies.forEach((pharmacy, index) => {
      const marker = L.marker([pharmacy.latitude, pharmacy.longitude], {
        icon: markerIcon(pharmacy.status, index + 1),
      }).bindPopup(popupHtml(pharmacy))
      marker.on('click', () => marker.openPopup())
      group.addLayer(marker)
    })

    if (pharmacies.length > 0) {
      map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 15 })
    } else {
      map.setView([city.lat, city.lng], 14)
    }
  }, [pharmacies, position, city])

  return <div ref={containerRef} className="h-[420px] w-full rounded-2xl sm:h-[520px]" role="application" aria-label="Carte des pharmacies de garde" />
}