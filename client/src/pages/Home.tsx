import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import { useMarks, useCreateMark } from "@/hooks/use-marks";
import { useSocket } from "@/hooks/use-socket";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { MapControls } from "@/components/MapControls";
import { MarkPopup } from "@/components/MarkPopup";
import { Mark, MarkColor } from "@shared/schema";
import { divIcon } from "leaflet";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import L from "leaflet";

// Fix Leaflet's default icon path issues in React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Custom Components for Map Interaction ---

function MarkerWithTimer({ mark }: { mark: Mark }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, new Date(mark.expiresAt).getTime() - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [mark.expiresAt]);

  const colorHex =
    mark.color === "blue" ? "#3b82f6" : mark.color === "green" ? "#22c55e" : "#9333ea";

  const icon = divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="pulse-ring" style="background-color: ${colorHex}"></div>
        <div style="
          background-color: ${colorHex};
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 10px;
          font-family: sans-serif;
          z-index: 2;
        ">
          ${timeLeft}
        </div>
        ${
          mark.color === "split"
            ? `
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 2px solid transparent;
            background: linear-gradient(90deg, #3b82f6 50%, #22c55e 50%);
            z-index: 1;
          "></div>
        `
            : ""
        }
      </div>
    `,
    className: "custom-marker-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

  return (
    <Marker position={[mark.lat, mark.lng]} icon={icon}>
      <Popup>
        <MarkPopup mark={mark} />
      </Popup>
    </Marker>
  );
}

function MapEvents({
  isAddingMode,
  onMapClick,
}: {
  isAddingMode: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 16 });
  }, [map]);

  useMapEvents({
    click(e) {
      if (isAddingMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function LocationMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();
  const { toast } = useToast();

  useEffect(() => {
    map
      .locate()
      .on("locationfound", function (e) {
        setPosition(e.latlng);
        map.flyTo(e.latlng, map.getZoom());
      })
      .on("locationerror", function () {
        toast({
          title: "Помилка геолокації",
          description: "Не вдалося отримати доступ до вашого місцезнаходження.",
          variant: "destructive",
        });
      });
  }, [map, toast]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Ви тут</Popup>
    </Marker>
  );
}

// --- Main Page Component ---

export default function Home() {
  // State
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState<MarkColor>("blue");
  const [mapCenter] = useState<[number, number]>([50.4501, 30.5234]); // За замовчуванням: Київ

  // Hooks
  const { data: marks, isLoading } = useMarks();
  const createMark = useCreateMark();
  useSocket(); // Initialize socket connection
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();
  const { toast } = useToast();
  const mapRef = useRef<L.Map>(null);

  // Handlers
  const handleAddClick = () => {
    setIsAddingMode(true);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    try {
      await createMark.mutateAsync({
        lat,
        lng,
        color: selectedColor,
      });

      setIsAddingMode(false);
      toast({
        title: "Мітку додано!",
        description: "Ваша мітка тепер видима всім поруч.",
        className: "bg-green-500 text-white border-none",
      });
    } catch (error) {
      toast({
        title: "Не вдалося додати мітку",
        description: "Будь ласка, спробуйте ще раз.",
        variant: "destructive",
      });
    }
  };

  const handleLocateMe = () => {
    mapRef.current?.locate({ setView: true, maxZoom: 16 });
  };

  // Custom Icon Generator
  const createCustomIcon = (color: MarkColor) => {
    const colorHex =
      color === "blue" ? "#3b82f6" : color === "green" ? "#22c55e" : "#9333ea";

    const html = `
      <div class="relative group">
        <div class="pulse-ring" style="background-color: ${colorHex}"></div>
        <div style="
          background-color: ${colorHex};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
        </div>
        ${
          color === "split"
            ? `
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid transparent;
          background: linear-gradient(90deg, #3b82f6 50%, #22c55e 50%);
          z-index: 1;
        "></div>
        `
            : ""
        }
      </div>
    `;

    return divIcon({
      html,
      className: "custom-marker-icon",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">Завантаження мапи…</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-slate-100">
      <MapContainer
        center={mapCenter}
        zoom={13}
        className="h-full w-full z-0"
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapEvents isAddingMode={isAddingMode} onMapClick={handleMapClick} />

        {marks?.map((mark) => (
          <MarkerWithTimer key={mark.id} mark={mark} />
        ))}
      </MapContainer>

      <MapControls
        onAddClick={handleAddClick}
        onColorSelect={setSelectedColor}
        selectedColor={selectedColor}
        isAddingMode={isAddingMode}
        onCancelAdd={() => setIsAddingMode(false)}
        onLocateMe={handleLocateMe}
        onToggleNotifications={subscribe}
        notificationsEnabled={isSubscribed}
        notificationsSupported={isSupported}
      />

      {/* Brand Overlay */}
   <div className="absolute top-32 left-4 z-[1000] pointer-events-none">
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          <h1 className="font-display font-bold text-lg text-foreground">Мітки на мапі</h1>
        </div>
      </div>
    </div>
  );
}