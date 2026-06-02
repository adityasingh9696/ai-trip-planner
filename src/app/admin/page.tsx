"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { 
  ShieldCheck, Users, Globe, RefreshCw, Server, 
  Activity, ArrowLeft, ArrowRight, BarChart3, Settings, 
  Database, Terminal, Play, CheckCircle2, AlertTriangle 
} from "lucide-react";
import styles from "../plan/page.module.css";

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [liveSerp, setLiveSerp] = useState(true);
  const [clearedLogs, setClearedLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Simulated Global Operational metrics
  const systemMetrics = {
    totalUsers: "1,248",
    totalTrips: "4,892",
    flightSuccessRate: "99.4%",
    hotelAvgTime: "1.65s",
    geminiQuota: "82.4%",
  };

  // Simulated Global Generated Trips log across all users
  const globalTrips = [
    { id: "1", user: "manager@corporate.com", dest: "Tokyo, Japan", origin: "Mumbai", budget: "Luxury", date: "2026-06-15", status: "Active" },
    { id: "2", user: "dev.explorer@gmail.com", dest: "Paris, France", origin: "Delhi", budget: "Moderate", date: "2026-07-02", status: "Completed" },
    { id: "3", user: "backpack.lisa@yahoo.com", dest: "Goa, India", origin: "Lucknow", budget: "Budget", date: "2026-06-10", status: "Active" },
    { id: "4", user: "recruiter.premium@hiring.net", dest: "London, UK", origin: "Bengaluru", budget: "Luxury", date: "2026-08-20", status: "Queued" },
  ];

  // Simulated live logs from our Autonomous agents
  const agentLogs = [
    { time: "16:28:12", agent: "WeatherAgent", text: "Successfully resolved weather forecast for Goa: 31°C, light shower particles." },
    { time: "16:28:15", agent: "FlightAgent", text: "SerpAPI token status: Valid. Extracted 3 comparative Indigo/Air India pricing boards." },
    { time: "16:28:18", agent: "HotelAgent", text: "Fetched 5 luxury Calangute properties. Lowest rate detected: ₹2,800/night." },
    { time: "16:28:22", agent: "OrchestratorAgent", text: "State merged. Recalculated 5-Day itinerary schema. Delivered final payload." }
  ];

  if (!isLoaded) return <div className={styles.container} style={{ textAlign: 'center', padding: '10rem 0' }}>Syncing console credentials...</div>;
  if (!user) return <div className={styles.container} style={{ textAlign: 'center', padding: '10rem 0' }}>Access Denied. Admin sign-in required.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <Link href="/dashboard" className={styles.backLink}>
        <ArrowLeft size={20} /> Back to Dashboard
      </Link>

      <div className={styles.header} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: '2.75rem', background: 'linear-gradient(135deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={40} style={{ color: '#8b5cf6' }} /> Operations Console
          </h1>
          <p style={{ color: '#94a3b8', fontWeight: 300, fontSize: '1.15rem', marginTop: '0.25rem' }}>System Administrative Panel. Monitor pipelines, active threads, and global agent parameters.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard" className={styles.toolBtn} style={{ textDecoration: 'none' }}>
            User Dashboard
          </Link>
          <Link href="/plan" className={styles.submitBtn} style={{ padding: '12px 24px', fontSize: '0.95rem', boxShadow: 'none', textDecoration: 'none' }}>
            Plan Trip
          </Link>
        </div>
      </div>

      {/* Analytics Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '2.5rem', position: 'relative', zIndex: 10 }}>
        <div className={styles.formCard} style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', padding: '12px', borderRadius: '12px' }}>
            <Users size={28} />
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Active Users</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{systemMetrics.totalUsers}</h3>
          </div>
        </div>

        <div className={styles.formCard} style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '12px', borderRadius: '12px' }}>
            <Globe size={28} />
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Total Plans</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{systemMetrics.totalTrips}</h3>
          </div>
        </div>

        <div className={styles.formCard} style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '12px', borderRadius: '12px' }}>
            <Activity size={28} />
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Flights Uptime</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{systemMetrics.flightSuccessRate}</h3>
          </div>
        </div>

        <div className={styles.formCard} style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '12px', borderRadius: '12px' }}>
            <Server size={28} />
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Hotel API latency</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{systemMetrics.hotelAvgTime}</h3>
          </div>
        </div>
      </div>

      <div className={styles.layout} style={{ marginTop: '2.5rem', position: 'relative', zIndex: 10 }}>
        {/* Left Side Controllers */}
        <div className={styles.formCard}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} style={{ color: '#8b5cf6' }} /> Console Configuration
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>SerpAPI Sandbox Overrides</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Live APIs: {liveSerp ? "ON" : "OFF"}</span>
                <button 
                  type="button" 
                  onClick={() => setLiveSerp(!liveSerp)} 
                  className={styles.toolBtn} 
                  style={{ padding: '6px 12px', background: liveSerp ? '#10b981' : '#ef4444', color: '#fff', border: 'none' }}
                >
                  Toggle
                </button>
              </div>
            </div>

            <div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>Database Management</p>
              <button 
                type="button" 
                onClick={() => {
                  setClearedLogs(true);
                  alert("Global system execution cache cleared successfully.");
                }} 
                className={styles.toolBtn} 
                style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', border: clearedLogs ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)', color: clearedLogs ? '#10b981' : '#cbd5e1' }}
              >
                <Database size={18} /> {clearedLogs ? "Cache Flushed" : "Flush System Execution Cache"}
              </button>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.75rem' }}>Active Orchestrator Nodes</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#94a3b8' }}>WeatherAgent:</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>🟢 Active Idle</span>
                </div>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#94a3b8' }}>FlightAgent:</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>🟢 Active Idle</span>
                </div>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#94a3b8' }}>HotelAgent:</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>🟢 Active Idle</span>
                </div>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: '#94a3b8' }}>ItineraryAgent:</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>🟢 Active Idle</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Logs & Archives */}
        <div className={styles.resultCard}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === "overview" ? styles.activeTab : ""}`} onClick={() => setActiveTab("overview")}>
              <BarChart3 size={16} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> System Records
            </button>
            <button className={`${styles.tab} ${activeTab === "logs" ? styles.activeTab : ""}`} onClick={() => setActiveTab("logs")}>
              <Terminal size={16} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> Live Agent Logs
            </button>
          </div>

          {activeTab === "overview" && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>Global Generated Trip Records</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {globalTrips.map((trip) => (
                  <div key={trip.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{trip.dest}</h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '2px' }}>User: {trip.user} • From: {trip.origin}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {trip.status}
                      </span>
                      <p style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '4px' }}>Date: {trip.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Terminal Stream</h2>
                <button className={styles.toolBtn} onClick={() => alert("Updating active streams...")} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', fontFamily: 'monospace', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                {agentLogs.map((log, idx) => (
                  <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>[{log.time}]</span>{' '}
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>{log.agent}</span>:{' '}
                    <span style={{ color: '#cbd5e1' }}>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
