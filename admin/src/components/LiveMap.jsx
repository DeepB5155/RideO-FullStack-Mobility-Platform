import { useEffect, useState } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import api from '../api';

// Important: User should replace this with their actual token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const LiveMap = () => {
    const [liveDrivers, setLiveDrivers] = useState([]);
    const [viewState, setViewState] = useState({
        longitude: 72.6369,
        latitude: 23.2156,
        zoom: 13
    });
    const [adminPos, setAdminPos] = useState(null);

    // Initial Geolocation for Admin
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                // We keep the admin map focused on Gandhinagar as requested,
                // but we still save the admin's physical position for the ⭐ marker
                setAdminPos([longitude, latitude]); 
            }, (err) => {
                console.warn("Geolocation permission denied or disabled.", err);
            });
        }
    }, []);

    // Poll Backend API for real MongoDB Live Locations
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await api.get('/admin/live-locations');
                
                if (response.data && response.data.length > 0) {
                    setLiveDrivers(response.data);
                } else if (adminPos) {
                    // Inject mock responsive drivers purely for preview if MongoDB is empty
                    const [lng, lat] = adminPos;
                    setLiveDrivers([
                        { driverId: "Mock-1", location: { coordinates: [lng + 0.01, lat + 0.01] } },
                        { driverId: "Mock-2", location: { coordinates: [lng - 0.015, lat + 0.005] } },
                        { driverId: "Mock-3", location: { coordinates: [lng + 0.005, lat - 0.01] } }
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch live locations:", error);
            }
        };

        fetchLocations();
        const intervalId = setInterval(fetchLocations, 5000); // 5 seconds polling

        return () => clearInterval(intervalId);
    }, [adminPos]);

    return (
        <div style={{ height: '500px', width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                <GeolocateControl position="top-right" trackUserLocation={true} />
                <NavigationControl position="top-right" />

                {/* Render Admin Marker */}
                {adminPos && (
                    <Marker longitude={adminPos[0]} latitude={adminPos[1]} anchor="bottom">
                        <div style={{ fontSize: '24px' }} title="You (Admin)">⭐</div>
                    </Marker>
                )}

                {/* Render Drivers */}
                {liveDrivers.map((driver, idx) => (
                    <Marker 
                        key={driver.driverId || idx} 
                        longitude={driver.location.coordinates[0]} 
                        latitude={driver.location.coordinates[1]} 
                        anchor="bottom"
                    >
                        <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundImage: 'url(https://cdn-icons-png.flaticon.com/512/3204/3204060.png)',
                            backgroundSize: 'cover',
                            cursor: 'pointer'
                        }} title={`Driver ID: ${driver.driverId}`} />
                    </Marker>
                ))}
            </Map>
        </div>
    );
};

export default LiveMap;
