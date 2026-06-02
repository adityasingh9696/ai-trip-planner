"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldCheck, Users, Globe, RefreshCw, Server, 
  Activity, ArrowLeft, BarChart3, Settings, 
  Database, Terminal, CheckCircle2, AlertTriangle,
  Lock, KeyRound, Sliders, ToggleLeft, ToggleRight, 
  Trash2, Play, DollarSign, Filter, Ban, CheckSquare
} from "lucide-react";
import styles from "../plan/page.module.css";

export default function AdminPage() {
  // Authentication Gate State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // System Controls State
  const [liveSerp, setLiveSerp] = useState(true);
  const [offlineFallback, setOfflineFallback] = useState(false);
  const [commissionRate, setCommissionRate] = useState(5);
  const [currency, setCurrency] = useState("INR");
  const [quotaSlider, setQuotaSlider] = useState(82);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [logFilter, setLogFilter] = useState("all");

  // Sources checked by pricing crawler
  const [searchSources, setSearchSources] = useState({
    skyscanner: true,
    googleflights: true,
    expedia: true,
    kayak: false
  });

  // Simulated live logs from our Autonomous agents
  const [agentLogs, setAgentLogs] = useState([
    { time: "23:14:02", agent: "WeatherAgent", text: "Successfully resolved weather forecast for Goa: 31°C, light shower particles.", type: "weather" },
    { time: "23:14:05", agent: "FlightAgent", text: "SerpAPI check: Verified Skyscanner & Expedia price lists. Recommended cheaper Indigo ticket.", type: "flight" },
    { time: "23:14:08", agent: "HotelAgent", text: "Matched 5 lodging spots. Filtered properties exceeding budget limit constraint.", type: "hotel" },
    { time: "23:14:12", agent: "OrchestratorAgent", text: "State merged. Generated complete travel payload containing geocoded coords.", type: "orchestrator" },
  ]);

  // Simulated Global Users List
  const [systemUsers, setSystemUsers] = useState([
    { id: "1", email: "manager@corporate.com", tripsCount: 14, status: "Active", limit: "95%", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80" },
    { id: "2", email: "dev.explorer@gmail.com", tripsCount: 8, status: "Active", limit: "80%", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" },
    { id: "3", email: "backpack.lisa@yahoo.com", tripsCount: 2, status: "Active", limit: "40%", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" },
    { id: "4", email: "recruiter.premium@hiring.net", tripsCount: 22, status: "Suspended", limit: "0%", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80" },
  ]);

  // Load auth session from sessionStorage to stay logged in on refresh
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem("admin_authenticated");
    if (sessionAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "wanderai-secure-2026") {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
      setLoginError("");
    } else {
      setLoginError("Invalid administrator credentials. Access Denied.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_authenticated");
  };

  // Log controls actions
  const triggerScrapePulse = () => {
    const timestamp = new Date().toTimeString().split(" ")[0];
    const logEntries = [
      { time: timestamp, agent: "FlightAgent", text: "Manual pulse request: Scraped live quotes across Skyscanner & Expedia.", type: "flight" },
      { time: timestamp, agent: "HotelAgent", text: "Recalculating local exchange rates matching currency variable.", type: "hotel" }
    ];
    setAgentLogs((prev) => [...prev, ...logEntries]);
  };

  const resetUserLimit = (id: string) => {
    setSystemUsers(prev => prev.map(u => u.id === id ? { ...u, limit: "100%", status: "Active" } : u));
    alert(`Reset user limits and unsuspended account if applicable.`);
  };

  const suspendUser = (id: string) => {
    setSystemUsers(prev => prev.map(u => u.id === id ? { ...u, limit: "0%", status: "Suspended" } : u));
  };

  const clearSystemLogs = () => {
    setAgentLogs([]);
    alert("Systems console streams purged.");
  };

  // Credentials Login View
  if (!isAuthenticated) {
    return (
      <div className={styles.container} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className={styles.bgOrb1} />
        <div className={styles.bgOrb2} />
        
        <div className={styles.formCard} style={{ width: '100%', maxWidth: '440px', padding: '3rem 2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '16px', borderRadius: '50%', color: '#a78bfa', marginBottom: '1rem' }}>
              <Lock size={32} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Operations Gate</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 300 }}>System Administration Credentials Verification</p>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className={styles.formGroup}>
              <label>Console Username</label>
              <input 
                type="text" 
                required 
                className={styles.input} 
                placeholder="Enter admin username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: '2rem' }}>
              <label>Gate Password</label>
              <input 
                type="password" 
                required 
                className={styles.input} 
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {loginError && (
              <div style={{ margin: '0 0 1.5rem 0', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} /> {loginError}
              </div>
            )}

            <button type="submit" className={styles.submitBtn}>
              <KeyRound size={18} /> Authenticate Console
            </button>
          </form>

          <Link href="/" className={styles.backLink} style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', marginBottom: 0 }}>
            <ArrowLeft size={16} /> Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Filtered logs list
  const filteredLogs = logFilter === "all" ? agentLogs : agentLogs.filter(log => log.type === logFilter);

  // Authenticated Admin Console View
  return (
    <div className={styles.container}>
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 10 }}>
        <Link href="/" className={styles.backLink} style={{ marginBottom: 0 }}>
          <ArrowLeft size={20} /> Back Home
        </Link>
        <button onClick={handleLogout} className={styles.toolBtn} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}>
          Lock Session
        </button>
      </div>

      <div className={styles.header} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 10, marginTop: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.75rem', background: 'linear-gradient(135deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={40} style={{ color: '#8b5cf6' }} /> Operations Console
          </h1>
          <p style={{ color: '#94a3b8', fontWeight: 300, fontSize: '1.15rem', marginTop: '0.25rem' }}>Global administrative configurations, API scrapers control panel, and system user databases.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard" className={styles.toolBtn} style={{ textDecoration: 'none' }}>
            User Workspace
          </Link>
          <Link href="/plan" className={styles.submitBtn} style={{ padding: '12px 24px', fontSize: '0.95rem', boxShadow: 'none', textDecoration: 'none' }}>
            Plan Trip
          </Link>
        </div>
      </div>

      {/* Interactive Global Metrics cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '2.5rem', position: 'relative', zIndex: 10 }}>
        <div className={styles.formCard} style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', padding: '12px', borderRadius: '12px' }}>
            <Users size={28} />
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Active Swarms</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>4 Nodes</h3>
          </div>
        </div>

        <div className={styles.formCard} style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '12px', borderRadius: '12px' }}>
            <Globe size={28} />
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Mock Overrides</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{offlineFallback ? "ONLINE" : "OFFLINE"}</h3>
          </div>
        </div>

        <div className={styles.formCard} style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '12px', borderRadius: '12px' }}>
            <Activity size={28} />
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Base Currency</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{currency}</h3>
          </div>
        </div>

        <div className={styles.formCard} style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '12px', borderRadius: '12px' }}>
            <Server size={28} />
          </div>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>SerpAPI Sandbox</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{liveSerp ? "ACTIVE" : "MOCKED"}</h3>
          </div>
        </div>
      </div>

      <div className={styles.layout} style={{ marginTop: '2.5rem', position: 'relative', zIndex: 10 }}>
        
        {/* Left Side: System Configurations */}
        <div className={styles.formCard}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={20} style={{ color: '#8b5cf6' }} /> System Parameters
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Live API Scraping Toggles */}
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>Live SerpAPI Scraping Engine</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>API Status: {liveSerp ? "Live" : "Sandbox Fallback"}</span>
                <button type="button" onClick={() => setLiveSerp(!liveSerp)} style={{ cursor: 'pointer', color: liveSerp ? '#10b981' : '#64748b' }}>
                  {liveSerp ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                </button>
              </div>
            </div>

            {/* Offline Database Fallback Override Toggle */}
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>Offline Gemini Fallback Database</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Force Offline fallback templates</span>
                <button type="button" onClick={() => setOfflineFallback(!offlineFallback)} style={{ cursor: 'pointer', color: offlineFallback ? '#10b981' : '#64748b' }}>
                  {offlineFallback ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                </button>
              </div>
            </div>

            {/* Price Crawler Sources Selector */}
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>Ticket Scraper Crawler Sources</p>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: '#cbd5e1' }}>
                  <input type="checkbox" checked={searchSources.skyscanner} onChange={e => setSearchSources({...searchSources, skyscanner: e.target.checked})} />
                  Skyscanner (Multi-Site Crawling)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: '#cbd5e1' }}>
                  <input type="checkbox" checked={searchSources.googleflights} onChange={e => setSearchSources({...searchSources, googleflights: e.target.checked})} />
                  Google Flights (Crawl direct rates)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: '#cbd5e1' }}>
                  <input type="checkbox" checked={searchSources.expedia} onChange={e => setSearchSources({...searchSources, expedia: e.target.checked})} />
                  Expedia Tickets
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: '#cbd5e1' }}>
                  <input type="checkbox" checked={searchSources.kayak} onChange={e => setSearchSources({...searchSources, kayak: e.target.checked})} />
                  Kayak Scraper
                </label>
              </div>
            </div>

            {/* Currency Selector */}
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>Operational Base Currency</p>
              <select className={styles.select} value={currency} onChange={e => setCurrency(e.target.value)} style={{ padding: '10px 14px' }}>
                <option value="INR">Indian Rupee (₹ - INR)</option>
                <option value="USD">US Dollar ($ - USD)</option>
                <option value="EUR">Euro (€ - EUR)</option>
                <option value="JPY">Japanese Yen (¥ - JPY)</option>
              </select>
            </div>

            {/* Extra Commission Markup */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>
                <span>Commission Markup Override</span>
                <span style={{ color: '#a78bfa' }}>{commissionRate}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="25" 
                className={styles.slider} 
                value={commissionRate} 
                onChange={e => setCommissionRate(parseInt(e.target.value))} 
                style={{ width: '100%', accentColor: '#8b5cf6', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', height: '6px' }}
              />
            </div>

            {/* Quota limit slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>
                <span>Gemini API Token Quota</span>
                <span style={{ color: '#fbbf24' }}>{quotaSlider}% Remaining</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className={styles.slider} 
                value={quotaSlider} 
                onChange={e => setQuotaSlider(parseInt(e.target.value))} 
                style={{ width: '100%', accentColor: '#fbbf24', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', height: '6px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={triggerScrapePulse} className={styles.toolBtn} style={{ flex: 1, padding: '10px', fontSize: '0.8rem', justifyContent: 'center' }}>
                <Play size={14} /> Scraper Pulse
              </button>
              <button onClick={clearSystemLogs} className={styles.toolBtn} style={{ flex: 1, padding: '10px', fontSize: '0.8rem', justifyContent: 'center', color: '#f87171', borderColor: 'rgba(248,113,113,0.2)' }}>
                Purge Console
              </button>
            </div>

          </div>
        </div>

        {/* Right Side: Tab Displays */}
        <div className={styles.resultCard}>
          <div className={styles.tabs} style={{ marginBottom: '1.5rem' }}>
            <button className={`${styles.tab} ${activeTab === "overview" ? styles.activeTab : ""}`} onClick={() => setActiveTab("overview")}>
              <BarChart3 size={16} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> User Directories
            </button>
            <button className={`${styles.tab} ${activeTab === "logs" ? styles.activeTab : ""}`} onClick={() => setActiveTab("logs")}>
              <Terminal size={16} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} /> Agents Streams
            </button>
          </div>

          {activeTab === "overview" && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>System Registered Accounts</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {systemUsers.map(userItem => (
                  <div key={userItem.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img 
                        src={userItem.avatar} 
                        alt={userItem.email} 
                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                      />
                      <div>
                        <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>{userItem.email}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Trips Generated: {userItem.tripsCount} • API Quota Usage: {userItem.limit}</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '30px', background: userItem.status === "Active" ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: userItem.status === "Active" ? '#10b981' : '#f87171', border: userItem.status === "Active" ? '1px solid rgba(16,185,129,0.1)' : '1px solid rgba(239,68,68,0.1)' }}>
                        {userItem.status}
                      </span>
                      <button onClick={() => resetUserLimit(userItem.id)} className={styles.toolBtn} style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px' }} title="Reset Limits">
                        Reset
                      </button>
                      {userItem.status === "Active" && (
                        <button onClick={() => suspendUser(userItem.id)} className={styles.toolBtn} style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.1)', borderRadius: '6px' }} title="Suspend User">
                          <Ban size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Terminal Stream Logs</h2>
                
                {/* Log filters dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Filter size={14} style={{ color: '#a78bfa' }} />
                  <select className={styles.select} value={logFilter} onChange={e => setLogFilter(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#090d16', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '6px', width: 'auto' }}>
                    <option value="all">All Logs</option>
                    <option value="weather">WeatherAgent</option>
                    <option value="flight">FlightAgent</option>
                    <option value="hotel">HotelAgent</option>
                    <option value="orchestrator">OrchestratorAgent</option>
                  </select>
                </div>
              </div>

              <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', fontFamily: 'monospace', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, idx) => (
                    <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.5rem', lineHeight: '1.4' }}>
                      <span style={{ color: '#64748b' }}>[{log.time}]</span>{' '}
                      <span style={{ color: '#a78bfa', fontWeight: 700 }}>{log.agent}</span>:{' '}
                      <span style={{ color: '#cbd5e1' }}>{log.text}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>
                    No stream logs detected matching current filters.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
