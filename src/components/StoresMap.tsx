import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for bundlers
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

export interface StoreLocation {
    name: string;
    address: string;
    city: string;
    hours: string;
    phone?: string;
    webChanges: boolean;
    coords: [number, number];
    tag?: string;
}

interface StoresMapProps {
    stores: StoreLocation[];
}

export default function StoresMap({ stores }: StoresMapProps) {
    return (
        <MapContainer
            center={[-38.0, -63.5]}
            zoom={4}
            style={{ height: '300px', width: '100%' }}
            scrollWheelZoom={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {stores.map((store, idx) => (
                <Marker key={idx} position={store.coords}>
                    <Popup>
                        <strong>{store.name}</strong><br />
                        {store.address}<br />
                        {store.hours && <><small>{store.hours}</small><br /></>}
                        {store.phone && <><small>{store.phone}</small><br /></>}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
