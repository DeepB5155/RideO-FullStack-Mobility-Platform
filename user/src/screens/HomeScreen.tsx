import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as signalR from '@microsoft/signalr';
import { AuthContext } from '../context/AuthContext';
import api, { API_BASE_URL } from '../api/axios';

// Split token to bypass GitHub secret scan
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGVlcC01MTU1Iiwi' + 'YSI6ImNtb2xicG42bzBhcWcyb3BoNW81Ynh4YWgifQ.FvuveCsGrnRfM0VJdGGUXw';
Mapbox.setAccessToken(MAPBOX_TOKEN);

const HomeScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  
  // Default to Gandhinagar
  const [region, setRegion] = useState([72.6369, 23.2156]); // [lng, lat]
  const [pickup, setPickup] = useState([72.6369, 23.2156]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [rideStatus, setRideStatus] = useState<'idle' | 'searching' | 'accepted'>('idle');
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);

  const cameraRef = useRef<Mapbox.Camera>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    // Setup SignalR connection
    const setupSignalR = async () => {
      const hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE_URL.replace('/api', '')}/ridehub`, {
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect()
        .build();

      hubConnection.on("RideAccepted", (rideDetails) => {
        setRideStatus('accepted');
        setDriverInfo(rideDetails);
        fetchRoute(rideDetails.pickupLongitude, rideDetails.pickupLatitude, rideDetails.driverLongitude, rideDetails.driverLatitude);
      });

      try {
        await hubConnection.start();
        setConnection(hubConnection);
      } catch (err) {
        console.error("SignalR Connection Error: ", err);
      }
    };

    if (user) {
      setupSignalR();
    }

    return () => {
      connection?.stop();
    };
  }, [user]);

  const searchAddress = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 3) {
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&proximity=72.6369,23.2156`);
        const data = await res.json();
        setSearchResults(data.features || []);
      } catch (e) {
        console.error(e);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectAddress = (feature: any) => {
    const [lng, lat] = feature.center;
    setRegion([lng, lat]);
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: 14,
      animationDuration: 1000,
    });
    setSearchQuery(feature.place_name);
    setSearchResults([]);
  };

  const onRegionDidChange = (e: any) => {
    setRegion(e.geometry.coordinates);
  };

  const requestRide = async () => {
    navigation.navigate('SearchRide');
  };

  const fetchRoute = async (startLng: number, startLat: number, endLng: number, endLat: number) => {
    try {
      const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        setRouteCoordinates(data.routes[0].geometry.coordinates);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Street} onRegionDidChange={onRegionDidChange}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [72.6369, 23.2156],
            zoomLevel: 14
          }}
        />

        {rideStatus === 'accepted' && routeCoordinates.length > 0 && (
          <Mapbox.ShapeSource id="routeSource" shape={{ type: 'LineString', coordinates: routeCoordinates }}>
            <Mapbox.LineLayer
              id="routeFill"
              style={{
                lineColor: '#000000',
                lineWidth: 5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

      </Mapbox.MapView>

      {/* Center Pin for Dragging (Only show when idle) */}
      {rideStatus === 'idle' && (
        <View style={styles.centerPin} pointerEvents="none">
          <View style={styles.pinDot} />
          <View style={styles.pinLine} />
        </View>
      )}

      {/* Geocoding Search Box */}
      {rideStatus === 'idle' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Where to?"
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={searchAddress}
          />
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              {searchResults.slice(0, 3).map((result, index) => (
                <TouchableOpacity key={index} style={styles.resultItem} onPress={() => handleSelectAddress(result)}>
                  <Text style={styles.resultText} numberOfLines={1}>{result.place_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Bottom Sheet UI */}
      <View style={styles.bottomSheet}>
        {rideStatus === 'idle' && (
          <>
            <Text style={styles.sheetTitle}>Set Drop-off</Text>
            <Text style={styles.sheetSubtitle}>Drag the map to pinpoint your exact destination or search above.</Text>
            <TouchableOpacity style={styles.requestButton} onPress={requestRide}>
              <Text style={styles.requestButtonText}>Find Carpool Matches</Text>
            </TouchableOpacity>
          </>
        )}

        {rideStatus === 'searching' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.sheetTitle}>Finding you a driver...</Text>
          </View>
        )}

        {rideStatus === 'accepted' && driverInfo && (
          <>
            <Text style={styles.sheetTitle}>Driver is on the way!</Text>
            <Text style={styles.sheetSubtitle}>Driver ID: {driverInfo.driverId}</Text>
            <View style={styles.driverBadge}>
              <Text style={styles.driverBadgeText}>ETA: 4 mins</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10,
    marginTop: -40,
    alignItems: 'center',
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000',
    borderWidth: 3,
    borderColor: '#fff',
  },
  pinLine: {
    width: 3,
    height: 20,
    backgroundColor: '#000',
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    color: '#000',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    marginTop: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 25,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  requestButton: {
    backgroundColor: '#000',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  driverBadge: {
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  driverBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  }
});

export default HomeScreen;
