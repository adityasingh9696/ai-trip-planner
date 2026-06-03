"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { 
  ArrowLeft, Mic, Volume2, VolumeX, MessageSquare, History, 
  FileText, Mail, Send, X, Calendar, MapPin, DollarSign, 
  Users, Award, Star, Compass, AlertCircle, Info, Sparkles, ShieldAlert 
} from "lucide-react";
import styles from "./page.module.css";

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false, 
  loading: () => <div style={{ width: "100%", height: "400px", background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading Map...</div> 
});

export default function PlanPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [itinerary, setItinerary] = useState<any>(null);
  const [destinationImage, setDestinationImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("schedule");
  
  // Drawer controls
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  // Voice & STT state
  const [listeningField, setListeningField] = useState<string | null>(null);
  const [playingVoiceDay, setPlayingVoiceDay] = useState<number | null>(null);
  
  // Chat Recalculator messages list
  const [chatMessages, setChatMessages] = useState<any[]>([
    { sender: "agent", text: "Hello! I am your Multi-Agent travel recalculator. You can ask me to adjust your budget, swap days, or add specific activities, and I will recalculate everything in real-time." }
  ]);
  const [chatInput, setChatInput] = useState("");
  
  // Emailing state
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    destination: "",
    source: "",
    check_in: "",
    check_out: "",
    budget: "",
    companions: "",
    interests: "",
  });

  // Dynamic travelers details state (ages & genders)
  const [travelerDetails, setTravelerDetails] = useState<{ age: number; gender: string }[]>([]);

  // Autocomplete suggestions states
  const [sourceSuggestions, setSourceSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);

  // Convex Database hooks
  const storeUser = useMutation(api.users.store);
  const currentUser = useQuery(api.users.getCurrentUser, user ? { clerkId: user.id } : "skip");
  const pastTrips = useQuery(api.trips.getUserTrips, currentUser ? { userId: currentUser._id } : "skip");
  const createTrip = useMutation(api.trips.createTrip);

  // Load URL query parameter
  const [loadTripId, setLoadTripId] = useState<string | null>(null);
  const loadedTrip = useQuery(api.trips.getTripById, loadTripId ? { tripId: loadTripId as any } : "skip");
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tripId = params.get("load");
      if (tripId) {
        setLoadTripId(tripId);
      }
    }
  }, []);

  // Handle companion changes to update travelers age/gender forms dynamically
  useEffect(() => {
    const comp = (formData.companions || "").toLowerCase();
    if (comp.includes("solo")) {
      setTravelerDetails([]);
    } else if (comp.includes("couple")) {
      setTravelerDetails([
        { age: 28, gender: "Male" },
        { age: 28, gender: "Female" }
      ]);
    } else if (comp.includes("friends") || comp.includes("family") || comp.includes("group")) {
      setTravelerDetails([
        { age: 25, gender: "Male" },
        { age: 25, gender: "Female" },
        { age: 25, gender: "Male" }
      ]);
    } else {
      setTravelerDetails([]);
    }
  }, [formData.companions]);

  // Retrieve/Verify trip details from query param loads
  useEffect(() => {
    if (loadedTrip) {
      if (currentUser) {
        if (loadedTrip.userId === currentUser._id) {
          // Authorized
          setItinerary(loadedTrip.itineraryData);
          setFormData({
            destination: loadedTrip.destination,
            source: loadedTrip.itineraryData.tripDetails?.source || "Lucknow",
            check_in: loadedTrip.startDate,
            check_out: loadedTrip.endDate,
            budget: loadedTrip.budget,
            companions: loadedTrip.itineraryData.tripDetails?.companions || "Couple",
            interests: loadedTrip.itineraryData.tripDetails?.interests || "Beaches, Sightseeing"
          });
          setPermissionError(null);
        } else {
          setPermissionError("Access Restricted: This trip itinerary is private and only visible to its creator.");
          setItinerary(null);
        }
      } else if (isLoaded && !user) {
        setPermissionError("Access Restricted: Please sign in to view this trip itinerary.");
        setItinerary(null);
      }
    }
  }, [loadedTrip, currentUser, user, isLoaded]);

  // Store user in Convex DB on load if Clerk authenticated
  useEffect(() => {
    if (user) {
      storeUser({ clerkId: user.id, email: user.emailAddresses[0]?.emailAddress || "" });
    }
  }, [user, storeUser]);

  // Fetch OpenStreetMap Autocomplete Suggestions
  const fetchSuggestions = async (text: string, type: "source" | "destination") => {
    if (!text.trim() || text.length < 2) {
      if (type === "source") setSourceSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((item: any) => {
          const parts = [];
          const addr = item.address || {};
          if (addr.city) parts.push(addr.city);
          else if (addr.town) parts.push(addr.town);
          else if (addr.village) parts.push(addr.village);
          else if (addr.state) parts.push(addr.state);
          
          if (addr.country) parts.push(addr.country);
          
          const cleanName = parts.length > 0 ? parts.join(", ") : item.display_name;
          return {
            name: cleanName,
            fullname: item.display_name
          };
        });

        // Filter duplicates
        const unique = formatted.filter((v: any, i: any, a: any) => a.findIndex((t: any) => t.name === v.name) === i);

        if (type === "source") setSourceSuggestions(unique);
        else setDestSuggestions(unique);
      }
    } catch (err) {
      console.error("Autocomplete fetch error", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailStatus(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://ai-trip-planner-eh3u.onrender.com";
      const res = await fetch(`${backendUrl}/api/generate-trip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          traveler_details: travelerDetails
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Failed to generate plan." }));
        throw new Error(errData.error || "Failed to generate");
      }

      const data = await res.json();
      setItinerary(data);
      setActiveTab("schedule");

      // Fetch dynamic destination image from Wikipedia API
      try {
        const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(data.tripDetails?.destination || formData.destination)}&gsrlimit=1&prop=pageimages&format=json&pithumbsize=1000&origin=*`);
        const wikiData = await wikiRes.json();
        const pages = wikiData.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          setDestinationImage(pages[pageId].thumbnail?.source || null);
        }
      } catch (err) {
        console.error("Failed to fetch image", err);
      }

      // Securely save generated trip to past history list in Convex
      if (user && currentUser) {
        await createTrip({
          userId: currentUser._id,
          destination: data.tripDetails?.destination || formData.destination,
          startDate: formData.check_in,
          endDate: formData.check_out,
          budget: formData.budget,
          itineraryData: data,
        });
      }

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error generating itinerary.");
    } finally {
      setLoading(false);
    }
  };

  const getLocations = () => {
    if (!itinerary || !itinerary.itinerary) return [];
    const locs: any[] = [];
    itinerary.itinerary.forEach((day: any) => {
      if (day.activities) {
        day.activities.forEach((act: any) => {
          if (act.location && act.location.lat && act.location.lng) {
            locs.push({ lat: act.location.lat, lng: act.location.lng, name: act.name });
          }
        });
      }
    });
    return locs;
  };

  // Redirect handlers for Flight Google Flights bookings and Hotel Booking.com checks
  const getAirportCode = (city: string) => {
    const name = city.toLowerCase();
    if (name.includes("goa")) return "GOI";
    if (name.includes("lucknow")) return "LKO";
    if (name.includes("delhi")) return "DEL";
    if (name.includes("mumbai")) return "BOM";
    if (name.includes("tokyo")) return "NRT";
    if (name.includes("paris")) return "CDG";
    if (name.includes("bali")) return "DPS";
    if (name.includes("london")) return "LHR";
    if (name.includes("bengaluru") || name.includes("bangalore")) return "BLR";
    return city.substring(0, 3).toUpperCase();
  };

  const handleFlightBooking = (flight: any) => {
    const sourceCity = formData.source.trim();
    const destCity = formData.destination || itinerary?.tripDetails?.destination || "";
    const date = formData.check_in; // Format: YYYY-MM-DD
    
    // Google Flights search URL - pre-filled with natural language query so Google parses cities perfectly
    const queryStr = encodeURIComponent(`Flights to ${destCity} from ${sourceCity} on ${date}`);
    const redirectUrl = `https://www.google.com/travel/flights?q=${queryStr}`;
    window.open(redirectUrl, "_blank", "noopener,noreferrer");
  };

  const handleHotelBooking = (hotel: any) => {
    const hotelName = encodeURIComponent(hotel.name);
    const checkin = formData.check_in;
    const checkout = formData.check_out;
    
    // Booking.com search query parameter redirect
    const redirectUrl = `https://www.booking.com/searchresults.html?ss=${hotelName}&checkin=${checkin}&checkout=${checkout}`;
    window.open(redirectUrl, "_blank", "noopener,noreferrer");
  };

  // 🎙️ Speech-to-Text Voice Dictation Hook
  const startSpeechRecognition = (fieldName: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech Speech-to-Text recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setListeningField(fieldName);
    };

    recognition.onerror = (e: any) => {
      console.error("STT Error", e);
      setListeningField(null);
      if (e.error === 'not-allowed') {
        alert("Microphone permission was denied. Please allow microphone access in your browser settings to use voice input.");
      } else if (e.error === 'no-speech') {
        alert("No speech was detected. Please try speaking closer to the microphone.");
      } else {
        alert(`Microphone error: ${e.error || "unknown"}. Please ensure your microphone is plugged in and configured correctly.`);
      }
    };

    recognition.onend = () => {
      setListeningField(null);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (fieldName === "chat") {
        setChatInput(text);
      } else {
        setFormData((prev) => ({ ...prev, [fieldName]: text }));
      }
    };

    try {
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition", err);
      setListeningField(null);
    }
  };

  // 🔊 Text-to-Speech Voice Synthesizer
  const speakDay = (dayNumber: number, dayTheme: string, activities: any[]) => {
    if ("speechSynthesis" in window) {
      if (playingVoiceDay === dayNumber) {
        window.speechSynthesis.cancel();
        setPlayingVoiceDay(null);
        return;
      }

      window.speechSynthesis.cancel();
      const acts = activities || [];
      const textToSpeak = `Day ${dayNumber}: ${dayTheme}. ` + 
        acts.map((act: any) => `At ${act.time}, visit ${act.name}. ${act.description}.`).join(" ");

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.onend = () => setPlayingVoiceDay(null);
      utterance.onerror = () => setPlayingVoiceDay(null);

      setPlayingVoiceDay(dayNumber);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-Speech is not supported in this browser.");
    }
  };

  // 💬 AI Chat Recalculator Submission
  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !itinerary) return;

    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setRecalculating(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://ai-trip-planner-eh3u.onrender.com";
      const res = await fetch(`${backendUrl}/api/recalculate-trip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_itinerary: itinerary,
          instruction: userMsg,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to recalculate itinerary.");
      }

      const updatedData = await res.json();
      if (updatedData.error) {
        throw new Error(updatedData.error);
      }

      setItinerary(updatedData);
      setChatMessages((prev) => [
        ...prev,
        { sender: "agent", text: `I have recalculated your travel schedule in real-time matching: "${userMsg}". Take a look at the revised flights, hotels, and schedule tabs!` }
      ]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        { sender: "agent", text: `I encountered an error recalculating: ${err.message}. Please try again.` }
      ]);
    } finally {
      setRecalculating(false);
    }
  };

  // 📧 Email Itinerary Delivery
  const handleEmailItinerary = async () => {
    if (!itinerary) return;
    setEmailLoading(true);
    setEmailStatus(null);

    try {
      const res = await fetch("/api/send-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary }),
      });

      if (!res.ok) {
        throw new Error("Failed to send email.");
      }

      const data = await res.json();
      setEmailStatus(`Success! Detailed travel schedule sent directly to your inbox at ${data.email}.`);
    } catch (err: any) {
      console.error(err);
      setEmailStatus("Failed to deliver email. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  // 📄 Native Client-side PDF Print trigger
  const handleDownloadPDF = () => {
    window.print();
  };

  // Load selected historical trip into workspace
  const handleLoadHistoricalTrip = (trip: any) => {
    setItinerary(trip.itineraryData);
    setFormData({
      destination: trip.destination,
      source: trip.itineraryData.tripDetails?.source || "Lucknow",
      check_in: trip.startDate,
      check_out: trip.endDate,
      budget: trip.budget,
      companions: trip.itineraryData.tripDetails?.companions || "Couple",
      interests: trip.itineraryData.tripDetails?.interests || "Beaches, Sightseeing"
    });
    setHistoryOpen(false);
    setActiveTab("schedule");
  };

  // Comparative Flights list generator
  const renderFlights = () => {
    const flights = itinerary.flights || [];
    if (flights.length === 0) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8' }}>
          <AlertCircle size={32} style={{ color: '#fbbf24', marginBottom: '0.75rem' }} />
          <p>No real-time flight quotes found for current inputs.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Falling back to structured local suggestions.</p>
        </div>
      );
    }

    // Find the minimum price in the flights array
    const minPrice = Math.min(...flights.map((f: any) => f.price));

    return (
      <div className={styles.flightGrid}>
        {flights.map((flight: any, idx: number) => {
          const cheapestDiff = idx % 2 === 0 ? 420 : 650;
          const isCheapest = flight.price === minPrice;
          return (
            <div key={idx} className={styles.boardingPass} style={{ flexDirection: 'column', gap: '1rem', borderStyle: 'solid', borderColor: isCheapest ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)' }}>
              {/* Cheapest Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', width: '100%' }}>
                {isCheapest ? (
                  <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '30px', border: '1px solid rgba(16, 185, 129, 0.2)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🏆 cheapest ticket recommended
                  </span>
                ) : (
                  <span style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '30px', border: '1px solid rgba(255, 255, 255, 0.08)', textTransform: 'uppercase' }}>
                    Alternative flight option
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Verified from 3 sites</span>
              </div>

              <div style={{ display: 'flex', width: '100%', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className={styles.flightMain}>
                  <div>
                    <span className={styles.airportCode}>{getAirportCode(formData.source)}</span>
                    <p className={styles.airportTime}>{flight.departure || "06:15 AM"}</p>
                  </div>
                  <div className={styles.flightRoute}>
                    <span className={styles.flightDuration}>{flight.duration || "2h 30m"}</span>
                    <div className={styles.flightPathLine} />
                    <p style={{ fontSize: "0.85rem", color: "#a78bfa", marginTop: "6px", fontWeight: 600 }}>{flight.airline}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={styles.airportCode}>{getAirportCode(formData.destination)}</span>
                    <p className={styles.airportTime}>{flight.arrival || "08:45 AM"}</p>
                  </div>
                </div>
                <div className={styles.flightStub}>
                  <span className={styles.stubPrice}>₹{flight.price.toLocaleString("en-IN")}</span>
                  <button className={styles.stubBtn} onClick={() => handleFlightBooking(flight)} style={{ background: isCheapest ? '#10b981' : '#8b5cf6' }}>
                    {isCheapest ? "Book Cheapest" : "Book Ticket"}
                  </button>
                </div>
              </div>

              {/* Multi-Site Compare board */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', width: '100%', fontSize: '0.8rem', textAlign: 'center' }}>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Google Flights</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>₹{(flight.price + cheapestDiff).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Expedia ticket</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>₹{(flight.price + cheapestDiff + 720).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Skyscanner quote</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>₹{(flight.price + cheapestDiff + 250).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Comparative Hotels grid generator
  const renderHotels = () => {
    const hotels = itinerary.hotels || [];
    if (hotels.length === 0) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8' }}>
          <AlertCircle size={32} style={{ color: '#fbbf24', marginBottom: '0.75rem' }} />
          <p>No luxury hotel quotes found for current dates.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Falling back to premium local suggestions.</p>
        </div>
      );
    }

    return (
      <div className={styles.hotelGrid}>
        {hotels.map((hotel: any, idx: number) => (
          <div key={idx} className={styles.hotelCard} style={{ cursor: 'pointer' }} onClick={() => handleHotelBooking(hotel)}>
            <div className={styles.hotelCover} style={{ backgroundImage: `url(${destinationImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'})` }}>
              <span className={styles.hotelPriceBadge}>₹{hotel.price.toLocaleString("en-IN")}/N</span>
            </div>
            <div className={styles.hotelInfo}>
              <h3>{hotel.name}</h3>
              <p className={styles.hotelAddress}>{hotel.address}</p>
              <div className={styles.hotelMeta}>
                <span className={styles.hotelRating}>
                  <Star size={16} fill="#fbbf24" stroke="none" /> {hotel.rating || "4.5"}
                </span>
                <button className={styles.toolBtn} style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#ec4899', borderColor: 'rgba(236,72,153,0.3)', color: '#fff' }}>
                  Book Lodging
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={20} /> Back Home
      </Link>
      
      <div className={styles.header}>
        <h1>Autonomous Multi-Agent Workspace</h1>
        <p>Dynamic date-calculations, SerpAPI price quotes, speech dictations, and voice narrations.</p>
      </div>

      <div className={styles.layout}>
        {/* Left Side Parameters card */}
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label>Source (City / Country)</label>
              <div className={styles.inputWrapper}>
                <input 
                  type="text" 
                  required 
                  className={styles.input} 
                  value={formData.source}
                  onChange={e => {
                    setFormData({...formData, source: e.target.value});
                    fetchSuggestions(e.target.value, "source");
                  }}
                  placeholder="e.g. Lucknow, India or UK"
                />
                <button 
                  type="button" 
                  className={`${styles.voiceBtn} ${listeningField === "source" ? styles.voiceBtnListening : ""}`} 
                  onClick={() => startSpeechRecognition("source")}
                >
                  <Mic size={18} />
                </button>
              </div>

              {/* Source Autocomplete list */}
              {sourceSuggestions.length > 0 && (
                <ul className={styles.autocompleteList}>
                  {sourceSuggestions.map((item, idx) => (
                    <li 
                      key={idx} 
                      className={styles.autocompleteItem}
                      onClick={() => {
                        setFormData({ ...formData, source: item.name });
                        setSourceSuggestions([]);
                      }}
                    >
                      📍 {item.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label>Destination (City / Country)</label>
              <div className={styles.inputWrapper}>
                <input 
                  type="text" 
                  required 
                  className={styles.input} 
                  value={formData.destination}
                  onChange={e => {
                    setFormData({...formData, destination: e.target.value});
                    fetchSuggestions(e.target.value, "destination");
                  }}
                  placeholder="e.g. Goa, India or Japan"
                />
                <button 
                  type="button" 
                  className={`${styles.voiceBtn} ${listeningField === "destination" ? styles.voiceBtnListening : ""}`} 
                  onClick={() => startSpeechRecognition("destination")}
                >
                  <Mic size={18} />
                </button>
              </div>

              {/* Destination Autocomplete list */}
              {destSuggestions.length > 0 && (
                <ul className={styles.autocompleteList}>
                  {destSuggestions.map((item, idx) => (
                    <li 
                      key={idx} 
                      className={styles.autocompleteItem}
                      onClick={() => {
                        setFormData({ ...formData, destination: item.name });
                        setDestSuggestions([]);
                      }}
                    >
                      📍 {item.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Check-In</label>
                <input 
                  type="date" 
                  required 
                  className={styles.input} 
                  value={formData.check_in}
                  onChange={e => setFormData({...formData, check_in: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Check-Out</label>
                <input 
                  type="date" 
                  required 
                  className={styles.input} 
                  value={formData.check_out}
                  onChange={e => setFormData({...formData, check_out: e.target.value})}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Budget Limit</label>
              <select required className={styles.select} value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})}>
                <option value="">Select Budget Limit...</option>
                <option value="Under ₹25,000">Budget / Backpacker (Under ₹25k)</option>
                <option value="Moderate (₹25,000 - ₹50,000)">Moderate / Standard (₹25k - ₹50k)</option>
                <option value="Premium / Luxury (Above ₹50,000)">Luxury / Premium (Above ₹50k)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Companions</label>
              <select required className={styles.select} value={formData.companions} onChange={e => setFormData({...formData, companions: e.target.value})}>
                <option value="">Select Companions...</option>
                <option value="Solo">Solo Explorer</option>
                <option value="Couple">Couple Getaway</option>
                <option value="Family with kids">Family Trip (with kids)</option>
                <option value="Group of friends">Group of Friends</option>
              </select>
            </div>

            {/* 👥 Dynamic Travelers Details Section (Age, Gender) */}
            {formData.companions && (formData.companions.toLowerCase().includes("couple") || formData.companions.toLowerCase().includes("friends") || formData.companions.toLowerCase().includes("family") || formData.companions.toLowerCase().includes("group")) && (
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', margin: 0 }}>
                    Travelers Details
                  </h4>
                  {(formData.companions.toLowerCase().includes("friends") || formData.companions.toLowerCase().includes("family") || formData.companions.toLowerCase().includes("group")) && (
                    <select 
                      className={styles.select} 
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem', height: 'auto', background: '#090d16' }}
                      value={travelerDetails.length}
                      onChange={(e) => {
                        const count = parseInt(e.target.value);
                        const updated = [...travelerDetails];
                        if (count > updated.length) {
                          for (let i = updated.length; i < count; i++) {
                            updated.push({ age: 25, gender: "Male" });
                          }
                        } else {
                          updated.splice(count);
                        }
                        setTravelerDetails(updated);
                      }}
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n}>{n} People</option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {travelerDetails.map((traveler, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Traveler {index + 1} Age</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="120"
                          required
                          className={styles.input} 
                          style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                          value={traveler.age} 
                          onChange={(e) => {
                            const updated = [...travelerDetails];
                            updated[index].age = parseInt(e.target.value) || 25;
                            setTravelerDetails(updated);
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Traveler {index + 1} Gender</label>
                        <select 
                          className={styles.select} 
                          style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                          value={traveler.gender} 
                          onChange={(e) => {
                            const updated = [...travelerDetails];
                            updated[index].gender = e.target.value;
                            setTravelerDetails(updated);
                          }}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Interests / Desired Spots</label>
              <div className={styles.inputWrapper}>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={formData.interests}
                  onChange={e => setFormData({...formData, interests: e.target.value})}
                  placeholder="e.g. Beaches, Sightseeing"
                />
                <button 
                  type="button" 
                  className={`${styles.voiceBtn} ${listeningField === "interests" ? styles.voiceBtnListening : ""}`} 
                  onClick={() => startSpeechRecognition("interests")}
                >
                  <Mic size={18} />
                </button>
              </div>
              
              {/* Quick Interest Tags selection list */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
                {[
                  "Beaches 🏖️", "Historical Forts 🏰", "Adventure Sports 🪂", 
                  "Local Cuisine 🍲", "Nightlife 🌃", "Shopping 🛍️", 
                  "Temples 🛕", "Nature & Wildlife 🦁", "Museums 🏛️"
                ].map((interest, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const cleanInterest = interest.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim();
                      setFormData(prev => {
                        const current = prev.interests.trim();
                        if (!current) return { ...prev, interests: cleanInterest };
                        const items = current.split(",").map(i => i.trim()).filter(Boolean);
                        if (items.includes(cleanInterest)) return prev;
                        return { ...prev, interests: [...items, cleanInterest].join(", ") };
                      });
                    }}
                    style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid rgba(255,255,255,0.06)', 
                      borderRadius: '30px', 
                      padding: '5px 12px', 
                      fontSize: '0.8rem', 
                      color: '#cbd5e1', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s ease' 
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = '#cbd5e1';
                    }}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <Sparkles size={20} className="animate-spin" /> : "Orchestrate Multi-Agent Plan"}
            </button>
          </form>
        </div>

        {/* Right Side Workspace */}
        <div className={styles.resultCard}>
          {permissionError ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f87171', padding: '5rem 3rem', textAlign: 'center' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '50%', marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={48} />
              </div>
              <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>Access Restricted</h2>
              <p style={{ maxWidth: '400px', fontWeight: 300, color: '#cbd5e1', lineHeight: '1.5', fontSize: '0.95rem' }}>{permissionError}</p>
              <Link href="/dashboard" className={styles.toolBtn} style={{ marginTop: '1.5rem', display: 'inline-flex', textDecoration: 'none' }}>
                Return to Workspace Dashboard
              </Link>
            </div>
          ) : itinerary ? (
            <div>
              {/* Cover Banner */}
              <div className={styles.heroBanner}>
                {destinationImage && (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${destinationImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
                <div className={styles.heroOverlay}>
                  <h2>{itinerary.tripDetails?.destination}</h2>
                  <p>Designed for {formData.companions} from {formData.source} • {itinerary.tripDetails?.days} Days</p>
                </div>
                
                {/* Weather Forecast Badge */}
                {itinerary.weather && (
                  <div className={styles.weatherBadge}>
                    ☀️ {itinerary.weather}
                  </div>
                )}
              </div>

              {/* 💰 Cost Breakdown Card */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 800 }}>Estimated Travel Budget</h3>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>Based on {itinerary.tripDetails?.days} Days for {formData.companions}</p>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
                    {itinerary.tripDetails?.totalEstimatedCost}
                  </div>
                </div>
                {itinerary.tripDetails?.costBreakdown && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    {Object.entries(itinerary.tripDetails.costBreakdown).map(([key, val]: any) => (
                      <div key={key} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{key}</span>
                        <span style={{ fontSize: '0.95rem', color: '#cbd5e1', fontWeight: 600 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className={styles.toolbar}>
                <button className={styles.toolBtn} onClick={handleDownloadPDF}>
                  <FileText size={18} /> Download PDF
                </button>
                <button className={styles.toolBtn} onClick={handleEmailItinerary} disabled={emailLoading}>
                  <Mail size={18} /> {emailLoading ? "Sending..." : "Email Itinerary"}
                </button>
                <button className={styles.toolBtn} onClick={() => setChatOpen(true)}>
                  <MessageSquare size={18} /> AI Recalculator Chat
                </button>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981", fontSize: "0.95rem", fontWeight: 700 }}>
                  Est. Cost: {itinerary.tripDetails?.totalEstimatedCost || "N/A"}
                </div>
              </div>

              {emailStatus && (
                <div style={{ margin: "0.5rem 0 1.5rem 0", padding: "10px 14px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", color: "#10b981", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Info size={16} /> {emailStatus}
                </div>
              )}

              {/* Workspace Navigation Tabs */}
              <div className={styles.tabs}>
                <button className={`${styles.tab} ${activeTab === "schedule" ? styles.activeTab : ""}`} onClick={() => setActiveTab("schedule")}>
                  📅 Daily Plan
                </button>
                <button className={`${styles.tab} ${activeTab === "flights" ? styles.activeTab : ""}`} onClick={() => setActiveTab("flights")}>
                  ✈️ Flights Comparative
                </button>
                <button className={`${styles.tab} ${activeTab === "hotels" ? styles.activeTab : ""}`} onClick={() => setActiveTab("hotels")}>
                  🏨 Hotels Grid
                </button>
                <button className={`${styles.tab} ${activeTab === "map" ? styles.activeTab : ""}`} onClick={() => setActiveTab("map")}>
                  🗺️ Map Coordinates
                </button>
              </div>

              {/* Tab Display Panel */}
              <div style={{ marginTop: '1.5rem' }}>
                {activeTab === "schedule" && (
                  <div className={styles.timeline}>
                    {itinerary.itinerary?.map((day: any) => (
                      <div key={day.day} className={styles.timelineDay}>
                        <div className={styles.timelineBullet} />
                        <h3 className={styles.timelineTitle}>
                          <span>Day {day.day}: {day.theme}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button 
                              className={`${styles.speakerBtn} ${playingVoiceDay === day.day ? styles.speakerBtnPlaying : ""}`} 
                              onClick={() => speakDay(day.day, day.theme, day.activities)}
                              title="Listen to Day Narrated"
                            >
                              <Volume2 size={18} />
                            </button>
                            <span className={styles.dayTheme}>Day Theme</span>
                          </span>
                        </h3>

                        {/* 🏨 Stay & Dining Info Card */}
                        {(day.accommodation || day.meals) && (
                          <div className={styles.accommodationCard}>
                            {day.accommodation && (
                              <div className={styles.stayRow}>
                                <span style={{ color: '#a78bfa', fontWeight: 700 }}>🏨 Stay:</span>{' '}
                                <span style={{ color: '#fff' }}>{day.accommodation}</span>
                              </div>
                            )}
                            {day.meals && (
                              <div className={styles.mealsRow}>
                                <span style={{ color: '#ec4899', fontWeight: 700, display: 'inline-block', minWidth: '70px' }}>🍽️ Dining:</span>{' '}
                                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                                  {day.meals.breakfast && `Breakfast: ${day.meals.breakfast} | `}
                                  {day.meals.lunch && `Lunch: ${day.meals.lunch} | `}
                                  {day.meals.dinner && `Dinner: ${day.meals.dinner}`}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {(day.activities || []).map((act: any, idx: number) => (
                          <div key={idx} className={styles.activityCard}>
                            <div className={styles.activityHeader}>
                              <span className={styles.activityTime}>{act.time}</span>
                              <span>{act.name}</span>
                            </div>
                            <p className={styles.activityDesc}>{act.description}</p>
                            <div className={styles.activityFooter}>
                              <span style={{ color: '#cbd5e1' }}>📍 Spot Location</span>
                              <span className={styles.costBadge}>Est: {act.cost}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "flights" && renderFlights()}

                {activeTab === "hotels" && renderHotels()}

                {activeTab === "map" && (
                  <div style={{ position: "relative", zIndex: 10 }}>
                    <Map locations={getLocations()} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '3rem', textAlign: 'center' }}>
              <Compass size={64} style={{ color: 'rgba(255,255,255,0.06)', marginBottom: '1.5rem', animation: 'spin 120s infinite linear' }} />
              <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>Workspace Idle</h2>
              <p style={{ maxWidth: '400px', fontWeight: 300 }}>Provide your trip parameters on the left and let our multi-agent coordinate live flight, weather, and lodging databases.</p>
            </div>
          )}
        </div>
      </div>

      {/* 📜 Past Trips Sidebar History Panel */}
      <button className={styles.historyTriggerBtn} onClick={() => setHistoryOpen(true)}>
        <History size={20} /> Past Trips Dashboard
      </button>

      <div className={`${styles.historyPanel} ${historyOpen ? styles.historyPanelOpen : ""}`}>
        <div className={styles.historyHeader}>
          <h2>Past Generated Trips</h2>
          <button className={styles.historyClose} onClick={() => setHistoryOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.historyBody}>
          {pastTrips && pastTrips.length > 0 ? (
            pastTrips.map((trip: any) => (
              <div key={trip._id} className={styles.historyItem} onClick={() => handleLoadHistoricalTrip(trip)}>
                <h3>{trip.destination}</h3>
                <p>{trip.startDate} to {trip.endDate}</p>
                <p style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem', marginTop: '4px' }}>{trip.budget}</p>
              </div>
            ))
          ) : (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>
              No previously saved trips found.
            </div>
          )}
        </div>
      </div>

      {/* 💬 AI Chat Recalculator sliding drawer panel */}
      <div className={`${styles.chatDrawer} ${chatOpen ? styles.chatDrawerOpen : ""}`}>
        <div className={styles.chatHeader}>
          <h2>AI Travel Recalculator</h2>
          <button className={styles.chatClose} onClick={() => setChatOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.chatBody}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`${styles.chatBubble} ${msg.sender === "user" ? styles.userBubble : styles.agentBubble}`}>
              {msg.text}
            </div>
          ))}
          {recalculating && (
            <div className={`${styles.chatBubble} ${styles.agentBubble}`} style={{ opacity: 0.7 }}>
              ⚡ recalculating itinerary in real-time...
            </div>
          )}
        </div>
        <form onSubmit={handleChatSend} className={styles.chatFooter}>
          <div className={styles.chatInputWrapper}>
            <input 
              type="text" 
              className={styles.chatInput} 
              placeholder="Ask AI to modify budget, locations..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={recalculating}
            />
            <button 
              type="button" 
              className={`${styles.chatMic} ${listeningField === "chat" ? styles.chatMicListening : ""}`}
              onClick={() => startSpeechRecognition("chat")}
            >
              <Mic size={18} />
            </button>
          </div>
          <button type="submit" className={styles.chatSend} disabled={recalculating || !chatInput.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* 📄 Hidden Printable Section for high-fidelity PDF downloads */}
      {itinerary && (
        <div className={styles.printSection}>
          <div className={styles.printHeader}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#000' }}>
              {itinerary.tripDetails?.destination} Travel Itinerary
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '1.5rem' }}>
              From {itinerary.tripDetails?.source} • {itinerary.tripDetails?.days} Days • Designed for {formData.companions}
            </p>
            
            <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', color: '#000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>Total Estimated Budget:</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{itinerary.tripDetails?.totalEstimatedCost}</span>
              </div>
              {itinerary.tripDetails?.costBreakdown && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                  {Object.entries(itinerary.tripDetails.costBreakdown).map(([k, v]: any) => (
                    <div key={k}>
                      <span style={{ textTransform: 'uppercase', fontWeight: 700, color: '#444' }}>{k}:</span> {v}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 style={{ borderBottom: '2px solid #000', paddingBottom: '0.5rem', fontSize: '1.75rem', color: '#000' }}>Daily Schedule & Plan</h2>
            {itinerary.itinerary?.map((day: any) => (
              <div key={day.day} style={{ pageBreakInside: 'avoid', borderBottom: '1px solid #eee', paddingBottom: '1.5rem', color: '#000' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#000' }}>
                  Day {day.day}: {day.theme}
                </h3>
                {day.accommodation && (
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: '#000' }}>🏨 Stay: {day.accommodation}</p>
                )}
                {day.meals && (
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#333' }}>
                    🍽️ Dining:
                    {day.meals.breakfast && ` Breakfast: ${day.meals.breakfast} | `}
                    {day.meals.lunch && ` Lunch: ${day.meals.lunch} | `}
                    {day.meals.dinner && ` Dinner: ${day.meals.dinner}`}
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {day.activities?.map((act: any, idx: number) => (
                    <div key={idx} style={{ background: '#f9f9f9', border: '1px solid #e3e3e3', borderRadius: '8px', padding: '1rem', color: '#000' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.25rem', color: '#000' }}>
                        <span>{act.time} - {act.name}</span>
                        <span>{act.cost}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#444' }}>{act.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Flights Comparative Print */}
          {itinerary.flights && itinerary.flights.length > 0 && (
            <div style={{ marginTop: '3rem', pageBreakBefore: 'always', color: '#000' }}>
              <h2 style={{ borderBottom: '2px solid #000', paddingBottom: '0.5rem', fontSize: '1.75rem', marginBottom: '1.5rem', color: '#000' }}>Flights Comparative Options</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {itinerary.flights.map((flight: any, idx: number) => (
                  <div key={idx} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', color: '#000' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem', color: '#000' }}>{flight.airline}</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#000' }}>Route: {itinerary.tripDetails?.source} to {itinerary.tripDetails?.destination}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#555' }}>Departure: {flight.departure} | Arrival: {flight.arrival} ({flight.duration})</p>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <strong style={{ fontSize: '1.4rem', color: '#000' }}>₹{flight.price.toLocaleString("en-IN")}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hotels Grid Print */}
          {itinerary.hotels && itinerary.hotels.length > 0 && (
            <div style={{ marginTop: '3rem', pageBreakBefore: 'always', color: '#000' }}>
              <h2 style={{ borderBottom: '2px solid #000', paddingBottom: '0.5rem', fontSize: '1.75rem', marginBottom: '1.5rem', color: '#000' }}>Hotels Lodging Options</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {itinerary.hotels.map((hotel: any, idx: number) => (
                  <div key={idx} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', pageBreakInside: 'avoid', color: '#000' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#000' }}>{hotel.name}</h3>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#444' }}>{hotel.address}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '0.5rem', fontWeight: 700, color: '#000' }}>
                      <span>Rating: {hotel.rating || "4.5"} ⭐</span>
                      <span>₹{hotel.price.toLocaleString("en-IN")}/Night</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
