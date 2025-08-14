import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import 'leaflet/dist/leaflet.css';

// Quick demo map with NO API key using OpenStreetMap + Leaflet.
// - Click map to drop/move marker and capture lat/lng
// - Simple search box using Nominatim (no key) – suitable for light demo use
// - File upload parses trailing number 001–100
// NOTE: Keep OSM attribution visible as required by the ODbL.

// Fix default icon paths (common gotcha in bundlers)
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function UploadAndPickLeaflet() {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState("");
  const [fileNumber, setFileNumber] = useState(null);
  const [fileError, setFileError] = useState("");

  const [marker, setMarker] = useState(null);
  const [center, setCenter] = useState({ lat: -37.78737, lng: 175.28221 }); // Auckland
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState("");

  const extractTrailingNumber = (name) => {
    const base = name.replace(/\.[^.]+$/, "");
    const match = base.match(/(\d{1,3})$/);
    if (!match) return { num: null, error: "Filename must end in a number (001–100)." };
    const n = parseInt(match[1], 10);
    if (Number.isNaN(n) || n < 1 || n > 100) return { num: null, error: "Number must be 001–100." };
    return { num: n, error: "" };
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const { num, error } = extractTrailingNumber(f.name);
    setFileNumber(num);
    setFileError(error);
  };

  const doSearch = async () => {
    setSearchError("");
    if (!search.trim()) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setSearchError("No results.");
        return;
      }
      const { lat, lon } = data[0];
      const pos = { lat: parseFloat(lat), lng: parseFloat(lon) };
      setCenter(pos);
      setMarker(pos);
    } catch (e) {
      setSearchError("Search failed.");
    }
  };

  const canContinue = fileNumber !== null && !fileError && !!marker;

  const handleContinue = () => {
    if (!canContinue || !marker) return;
    const code = String(fileNumber).padStart(3, "0");
    console.log({ fileName, fileNumber, location: marker });
    navigate(`/dashboard/${code}`, {
      state: { fileName, location: marker },
    });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">ECOnstruct</h1>
          <p className="text-gray-600">Greener Spaces for all</p>
        </header>

        {/* Location Picker */}
        <section className="rounded-2xl border p-4 shadow-sm space-y-3">
          <label className="block text-sm font-medium">Project location</label>
          <p className="text-xs text-gray-500">Tip: Click the map to set the marker. Light demo geocoding via Nominatim.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search address, place, or coordinates"
              className="w-full rounded-xl border px-3 py-2"
            />
            <button className="rounded-xl border px-3 py-2 text-sm" type="button" onClick={doSearch}>
              Search
            </button>
          </div>
          {searchError && <div className="text-sm text-red-600">{searchError}</div>}

          <div className="map-container h-[420px] w-full overflow-hidden rounded-2xl">
            <MapContainer center={center} zoom={17} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ClickHandler onPick={setMarker} />
              {marker && <Marker position={marker} />}
            </MapContainer>
          </div>
        </section>

        {/* File Upload */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium mb-2">BIM file of the building</label>
          <input
            type="file"
            onChange={onFileChange}
            className="block w-full rounded-xl border px-3 py-2"
            accept=".csv,.ifc"
          />
          {fileName && (
            <div className="mt-2 text-sm">
              <span className="font-medium">Selected:</span> {fileName}
            </div>
          )}
          {fileError ? (
            <div className="mt-2 text-sm text-red-600">{fileError}</div>
          ) : fileNumber !== null ? (
            <div className="mt-2 text-sm text-green-700">Detected number: {String(fileNumber).padStart(3, "0")}</div>
          ) : null}
        </section>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {marker ? (
              <span>Selected: {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}</span>
            ) : (
              <span>No location selected</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className={`rounded-2xl px-5 py-2 text-white shadow-sm transition ${
              canContinue ? "bg-black hover:opacity-90" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}