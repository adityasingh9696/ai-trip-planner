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
  Users, Award, Star, Compass, AlertCircle, Info, Sparkles 
} from "lucide-react";
import styles from "./page.module.css";

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false, 
  loading: () => <div style={{ width: "100%", height: "400px", background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading Map...</div> 
});

export default function PlanPage() {
  const { user } = useUser();
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
    destination: "Goa",
    source: "Lucknow",
    check_in: new Date().toISOString().split("T")[0],
    check_out: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
    budget: "Moderate",
    companions: "Couple",
    interests: "Beaches, Local Seafood, Sunset Cruises, Historical Forts",
  });

  // Convex Database hooks
  const storeUser = useMutation(api.users.store);
  const currentUser = useQuery(api.users.getCurrentUser, user ? { clerkId: user.id } : "skip");
  const pastTrips = useQuery(api.trips.getUserTrips, currentUser ? { userId: currentUser._id } : "skip");
  const createTrip = useMutation(api.trips.createTrip);

  // Store user in Convex DB on load if Clerk authenticated
  useEffect(() => {
    if (user) {
      storeUser({ clerkId: user.id, email: user.emailAddresses[0]?.emailAddress || "" });
    }
  }, [user, storeUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailStatus(null);
    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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

    recognition.start();
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
      const textToSpeak = `Day ${dayNumber}: ${dayTheme}. ` + 
        activities.map((act) => `At ${act.time}, visit ${act.name}. ${act.description}.`).join(" ");

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
      const res = await fetch("/api/recalculate", {
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

    return (
      <div className={styles.flightGrid}>
        {flights.map((flight: any, idx: number) => (
          <div key={idx} className={styles.boardingPass}>
            <div className={styles.flightMain}>
              <div>
                <span className={styles.airportCode}>{formData.source.substring(0, 3).toUpperCase()}</span>
                <p className={styles.airportTime}>{flight.departure || "06:15 AM"}</p>
              </div>
              <div className={styles.flightRoute}>
                <span className={styles.flightDuration}>{flight.duration || "2h 30m"}</span>
                <div className={styles.flightPathLine} />
                <p style={{ fontSize: "0.85rem", color: "#a78bfa", marginTop: "6px", fontWeight: 600 }}>{flight.airline}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={styles.airportCode}>{formData.destination.substring(0, 3).toUpperCase()}</span>
                <p className={styles.airportTime}>{flight.arrival || "08:45 AM"}</p>
              </div>
            </div>
            <div className={styles.flightStub}>
              <span className={styles.stubPrice}>₹{flight.price.toLocaleString("en-IN")}</span>
              <button className={styles.stubBtn} onClick={() => alert(`Redirecting to book flight on ${flight.airline} for ₹${flight.price}!`)}>Book</button>
            </div>
          </div>
        ))}
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
          <div key={idx} className={styles.hotelCard}>
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
                <span style={{ color: "#94a3b8" }}>({hotel.reviews_count || 320} reviews)</span>
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
            <div className={styles.formGroup}>
              <label>Source City</label>
              <div className={styles.inputWrapper}>
                <input 
                  type="text" 
                  required 
                  className={styles.input} 
                  value={formData.source}
                  onChange={e => setFormData({...formData, source: e.target.value})}
                />
                <button 
                  type="button" 
                  className={`${styles.voiceBtn} ${listeningField === "source" ? styles.voiceBtnListening : ""}`} 
                  onClick={() => startSpeechRecognition("source")}
                >
                  <Mic size={18} />
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Destination City</label>
              <div className={styles.inputWrapper}>
                <input 
                  type="text" 
                  required 
                  className={styles.input} 
                  value={formData.destination}
                  onChange={e => setFormData({...formData, destination: e.target.value})}
                />
                <button 
                  type="button" 
                  className={`${styles.voiceBtn} ${listeningField === "destination" ? styles.voiceBtnListening : ""}`} 
                  onClick={() => startSpeechRecognition("destination")}
                >
                  <Mic size={18} />
                </button>
              </div>
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
              <select className={styles.select} value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})}>
                <option value="Under ₹25,000">Budget / Backpacker (Under ₹25k)</option>
                <option value="Moderate (₹25,000 - ₹50,000)">Moderate / Standard (₹25k - ₹50k)</option>
                <option value="Premium / Luxury (Above ₹50,000)">Luxury / Premium (Above ₹50k)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Companions</label>
              <select className={styles.select} value={formData.companions} onChange={e => setFormData({...formData, companions: e.target.value})}>
                <option value="Solo">Solo Explorer</option>
                <option value="Couple">Couple Getaway</option>
                <option value="Family with kids">Family Trip (with kids)</option>
                <option value="Group of friends">Group of Friends</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Interests / Desired Spots</label>
              <div className={styles.inputWrapper}>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={formData.interests}
                  onChange={e => setFormData({...formData, interests: e.target.value})}
                />
                <button 
                  type="button" 
                  className={`${styles.voiceBtn} ${listeningField === "interests" ? styles.voiceBtnListening : ""}`} 
                  onClick={() => startSpeechRecognition("interests")}
                >
                  <Mic size={18} />
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <Sparkles size={20} className="animate-spin" /> : "Orchestrate Multi-Agent Plan"}
            </button>
          </form>
        </div>

        {/* Right Side Workspace */}
        <div className={styles.resultCard}>
          {itinerary ? (
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
                        {day.activities.map((act: any, idx: number) => (
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
    </div>
  );
}
