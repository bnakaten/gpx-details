import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GPXPoint, GPXStop } from '../types';

interface MapContainerProps {
  points: GPXPoint[];
  stops: GPXStop[];
  selectedStop: GPXStop | null;
  onStopSelect: (stop: GPXStop | null) => void;
}

export function MapContainer({ points, stops, selectedStop, onStopSelect }: MapContainerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const gpxLayerRef = useRef<L.Polyline | null>(null);
  const startLayerRef = useRef<L.Marker | null>(null);
  const endLayerRef = useRef<L.Marker | null>(null);
  const stopLayersRef = useRef<{ circle: L.Circle | null; marker: L.Marker | null }[]>([]);
  const selectedStopLayersRef = useRef<{ ring: L.Circle | null; center: L.CircleMarker | null } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        attributionControl: false,
        zoomControl: false
      }).setView([51.1657, 10.4515], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: ['a', 'b', 'c']
      }).addTo(mapRef.current);
      setIsMapReady(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    if (points.length === 0) {
      mapRef.current.setView([51.1657, 10.4515], 6);
      return;
    }

    if (gpxLayerRef.current) {
      mapRef.current.removeLayer(gpxLayerRef.current);
    }
    gpxLayerRef.current = L.polyline(points.map(pt => [pt.lat, pt.lon]), {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.85
    }).addTo(mapRef.current);

    if (startLayerRef.current) {
      mapRef.current.removeLayer(startLayerRef.current);
    }
    startLayerRef.current = L.circleMarker([points[0].lat, points[0].lon], {
      radius: 6,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 1,
      weight: 0
    }).addTo(mapRef.current);

    if (endLayerRef.current) {
      mapRef.current.removeLayer(endLayerRef.current);
    }
    endLayerRef.current = L.circleMarker([points[points.length - 1].lat, points[points.length - 1].lon], {
      radius: 6,
      color: '#e11d48',
      fillColor: '#e11d48',
      fillOpacity: 1,
      weight: 0
    }).addTo(mapRef.current);

    stops.forEach((stop, index) => {
      if (stopLayersRef.current[index]) {
        if (stopLayersRef.current[index].circle) {
          mapRef.current!.removeLayer(stopLayersRef.current[index].circle);
        }
        if (stopLayersRef.current[index].marker) {
          mapRef.current!.removeLayer(stopLayersRef.current[index].marker);
        }
      }

      const circle = L.circle([stop.lat, stop.lon], {
        radius: Math.max(stop.maxDistanceDelta, 10),
        color: '#f43f5e',
        fillColor: '#f43f5e',
        fillOpacity: 0.35,
        weight: 2
      }).addTo(mapRef.current);

      const marker = L.circleMarker([stop.lat, stop.lon], {
        radius: 8,
        color: '#e11d48',
        fillColor: '#e11d48',
        fillOpacity: 1,
        weight: 2,
        opacity: 1
      })
        .bindPopup(`
          <div class="font-sans text-xs p-2 bg-white rounded shadow-lg max-w-[200px]">
            <div class="font-bold text-rose-700 text-sm mb-2">Stopp #${index + 1}</div>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-gray-700">
              <span class="font-medium text-gray-500">Dauer:</span>
              <span class="font-bold text-gray-900">${stop.durationFormatted}</span>
              <span class="font-medium text-gray-500">Start:</span>
              <span>${new Date(stop.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span class="font-medium text-gray-500">Ende:</span>
              <span>${new Date(stop.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span class="font-medium text-gray-500">Streuung:</span>
              <span>&le; ${stop.maxDistanceDelta} m</span>
              <span class="font-medium text-gray-500">Punkte:</span>
              <span>${stop.pointCount}</span>
            </div>
            <button id="btn-popup-${stop.id}" class="w-full mt-3 bg-rose-600 text-white rounded py-2 px-3 font-semibold hover:bg-rose-700 transition text-xs cursor-pointer">
              In Liste auswählen
            </button>
          </div>
        `)
        .on('click', () => {
          const btn = document.getElementById(`btn-popup-${stop.id}`);
          if (btn) {
            btn.addEventListener('click', () => {
              onStopSelect(stop);
            });
          }
        })
        .addTo(mapRef.current);

      stopLayersRef.current[index] = { circle, marker };
    });

    const bounds = L.latLngBounds(points.map(pt => [pt.lat, pt.lon]));
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    } else {
      mapRef.current.setView([51.1657, 10.4515], 6);
    }
  }, [points, stops]);

  useEffect(() => {
    if (!mapRef.current || !isMapReady || !selectedStop) return;

    mapRef.current.setView([selectedStop.lat, selectedStop.lon], 18);

    if (selectedStopLayersRef.current) {
      if (selectedStopLayersRef.current.ring) {
        mapRef.current.removeLayer(selectedStopLayersRef.current.ring);
      }
      if (selectedStopLayersRef.current.center) {
        mapRef.current.removeLayer(selectedStopLayersRef.current.center);
      }
    }

    const ring = L.circle([selectedStop.lat, selectedStop.lon], {
      radius: Math.max(selectedStop.maxDistanceDelta * 1.5, 30),
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      weight: 3,
      dashArray: '2, 2'
    }).addTo(mapRef.current);

    const center = L.circleMarker([selectedStop.lat, selectedStop.lon], {
      radius: 6,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 1,
      weight: 2,
      opacity: 1
    }).addTo(mapRef.current);

    selectedStopLayersRef.current = { ring, center };
  }, [selectedStop]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-[#E5E7EB] bg-slate-50">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {!isMapReady && points.length === 0 && (
        <div className="absolute inset-0 bg-slate-50/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-slate-800">Keine Karte verfügbar</p>
          <p className="text-[11px] text-[#6B7280] max-w-xs mt-1 leading-relaxed">
            Lade eine GPX-Datei hoch, um den Streckenverlauf und die erkannten Standzeiten anzuzeigen.
          </p>
        </div>
      )}
    </div>
  );
}
