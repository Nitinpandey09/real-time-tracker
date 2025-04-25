const socket = io();
const map = L.map("map").setView([0, 0], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

const markers = {};

// ✅ Jitter function to prevent overlapping markers
function jitter(lat, lng) {
  const offset = 0.00008;
  return [
    lat + (Math.random() - 0.5) * offset,
    lng + (Math.random() - 0.5) * offset,
  ];
}

// ✅ Track Socket connection state
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});
socket.on("disconnect", () => {
  console.log("❌ Socket disconnected");
});

// ✅ Emit user info to server
socket.emit("join", USER);
console.log("🔌 JOINING SOCKET:", USER);

// ✅ Request location permission on load
if (!navigator.geolocation) {
  alert("❌ Geolocation not supported by your browser.");
} else {
  alert("🛰️ Requesting location...");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      alert("✅ Location permission granted");
      startTracking();
    },
    (err) => {
      alert("❌ Geolocation error: " + err.message);
      console.error("❌ Geolocation error:", err.message);
    },
    { enableHighAccuracy: true }
  );
}

// ✅ Start live tracking
function startTracking() {
  alert("🚀 startTracking() called");
  navigator.geolocation.watchPosition(
    (pos) => {
      alert("📍 watchPosition triggered");
      const { latitude, longitude, accuracy } = pos.coords;
      console.log(`📡 SENDING: ${latitude}, ${longitude} ±${accuracy}m`);
      socket.emit("send-location", { latitude, longitude });
    },
    (err) => {
      alert("❌ Tracking error: " + err.message);
      console.error("❌ watchPosition error:", err.message);
    },
    { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
  );
}

// ✅ Receive location updates
socket.on("receive-location", (data) => {
  console.log("📡 RECEIVED LOCATION:", data);

  const { id, latitude, longitude, username, avatar } = data;
  const [lat, lng] = jitter(latitude, longitude);
  const isOwnMarker = USER.username === username;

  const popupText = `${username}<br><small>GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}</small>`;

  if (!markers[id]) {
    const icon = avatar
      ? L.icon({ iconUrl: avatar, iconSize: [40, 40], iconAnchor: [20, 40] })
      : null;

    const markerOptions = { draggable: isOwnMarker };
    if (icon) markerOptions.icon = icon;

    const marker = L.marker([lat, lng], markerOptions)
      .addTo(map)
      .bindPopup(popupText)
      .openPopup();

    if (isOwnMarker) {
      marker.on("dragend", (e) => {
        const newPos = e.target.getLatLng();
        console.log("📍 Dragged to:", newPos);
        socket.emit("send-location", {
          latitude: newPos.lat,
          longitude: newPos.lng,
        });
      });
    }

    markers[id] = marker;
  } else {
    markers[id].setLatLng([lat, lng]);
    markers[id].setPopupContent(popupText);
  }

  fitToMarkers();
});

// ✅ Sidebar users list
socket.on("users", (list) => {
  const ul = document.getElementById("userList");
  ul.innerHTML = "";

  list.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user.username + (user.isAdmin ? " (Admin)" : "");
    ul.appendChild(li);

    if (!markers[user.id]) {
      const [jLat, jLng] = jitter(20.5937, 78.9629); // default center
      markers[user.id] = L.marker([jLat, jLng])
        .addTo(map)
        .bindPopup(`${user.username} (awaiting location...)`);
    }
  });

  fitToMarkers();
});

// ✅ Remove disconnected user's marker
socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
  fitToMarkers();
});

// ✅ Show toast messages
socket.on("toast", (msg) => {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.getElementById("toasts").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
});

// ✅ Fit the map to all markers
function fitToMarkers() {
  const group = new L.featureGroup(Object.values(markers));
  if (group.getLayers().length > 0) {
    map.fitBounds(group.getBounds().pad(0.25));
  }
}
