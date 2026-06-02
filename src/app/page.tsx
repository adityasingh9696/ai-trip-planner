import { SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { 
  MapPin, Plane, Hotel, Cloud, Sparkles, Navigation, 
  ShieldCheck, Compass, ArrowRight, Star, Heart, CheckCircle2,
  DollarSign, Globe, ShieldAlert
} from "lucide-react";
import styles from "./page.module.css";

export default async function Home() {
  const { userId } = await auth();

  // Premium destinations with Unsplash stock images
  const destinations = [
    {
      name: "Tokyo, Japan",
      image: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=600&q=80",
      description: "Neon-lit streets, historic temples, and premium culinary journeys.",
      tag: "Cultural Fusion"
    },
    {
      name: "Paris, France",
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80",
      description: "World-class art galleries, gourmet bistros, and iconic architecture.",
      tag: "Romantic Art"
    },
    {
      name: "Bali, Indonesia",
      image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80",
      description: "Lush tropical rainforests, volcanic peaks, and pristine beaches.",
      tag: "Tropical Paradise"
    },
    {
      name: "New York, USA",
      image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=600&q=80",
      description: "Broadway stages, soaring skyscrapers, and endless urban energy.",
      tag: "Metropolitan"
    }
  ];

  // Inspiring travel quotes
  const travelQuotes = [
    {
      quote: "The world is a book and those who do not travel read only one page.",
      author: "Saint Augustine"
    },
    {
      quote: "Travel makes one modest. You see what a tiny place you occupy in the world.",
      author: "Gustave Flaubert"
    },
    {
      quote: "We travel not to escape life, but for life not to escape us.",
      author: "Anonymous"
    }
  ];

  // Multi-Agent system nodes breakdown
  const agentNodes = [
    {
      name: "FlightScraperAgent",
      icon: <Plane size={24} />,
      desc: "Cross-checks prices across 5+ booking systems like Skyscanner and Expedia in real-time."
    },
    {
      name: "LodgingLocatorAgent",
      icon: <Hotel size={24} />,
      desc: "Scans reviews, locations, and pricing to locate the highest rated accommodations."
    },
    {
      name: "AtmosphereForecastAgent",
      icon: <Cloud size={24} />,
      desc: "Pulls weather coordinates and maps historical patterns for your travel duration."
    },
    {
      name: "ItineraryOrchestrator",
      icon: <Navigation size={24} />,
      desc: "Assembles daily timing blocks, routing links, and budget estimations under a unified schema."
    }
  ];

  return (
    <div className={styles.wrapper}>
      {/* Background Orbs */}
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      {/* Navigation Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <MapPin size={28} className={styles.logoIcon} />
          <span>WanderAI</span>
        </div>
        <nav className={styles.nav}>
          <Link href="/plan" className={styles.navLink}>Plan Trip</Link>
          {userId && <Link href="/dashboard" className={styles.navLink}>My Dashboard</Link>}
          <Link href="/admin" className={styles.navLinkAdmin}>
            <ShieldCheck size={18} /> Admin Console
          </Link>
          
          <div className={styles.authWrapper}>
            {!userId ? (
              <SignInButton mode="modal">
                <button className={styles.signInBtn}>Sign In</button>
              </SignInButton>
            ) : (
              <UserButton appearance={{ elements: { userButtonAvatarBox: styles.userAvatar } }} />
            )}
          </div>
        </nav>
      </header>

      {/* Hero Header Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.pillTag}>
            <Sparkles size={14} /> Driven by Autonomous Multi-Agents
          </div>
          <h1 className={styles.title}>
            Your Perfect Trip, Orchestrated in <span className={styles.gradientText}>Seconds.</span>
          </h1>
          <p className={styles.subtitle}>
            Stop spending weeks researching flight quotes, lodging grids, and local schedules. 
            Our swarm of specialized travel agents coordinates multiple databases to draft your dream itinerary instantly.
          </p>
          
          <div className={styles.ctaContainer}>
            {userId ? (
              <Link href="/plan" className={styles.ctaPrimary}>
                Start Planning Workspace <ArrowRight size={18} />
              </Link>
            ) : (
              <SignInButton mode="modal">
                <button className={styles.ctaPrimary}>
                  Get Started for Free <ArrowRight size={18} />
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </section>

      {/* Cheapest Flight Ticket Engine Illustration Card */}
      <section className={styles.ticketSection}>
        <div className={styles.sectionHeader}>
          <h2>Autonomous Flight Cost Comparison</h2>
          <p>We crawl major ticket platforms automatically to verify and suggest the absolute cheapest rates.</p>
        </div>
        <div className={styles.ticketComparisonCard}>
          <div className={styles.ticketCardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plane size={20} style={{ color: '#a78bfa' }} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Routing check: DEL ➔ TYO</span>
            </div>
            <span className={styles.liveEngineBadge}>🟢 Comparison Engine Active</span>
          </div>
          
          <div className={styles.sitesGrid}>
            <div className={styles.siteItem}>
              <span>Skyscanner quote</span>
              <strong>₹42,850</strong>
            </div>
            <div className={`${styles.siteItem} ${styles.siteItemCheapest}`}>
              <span className={styles.cheapestBadge}>Best Value (Recommended)</span>
              <span>WanderAI Flight Agent</span>
              <strong>₹38,200</strong>
            </div>
            <div className={styles.siteItem}>
              <span>Expedia ticket</span>
              <strong>₹43,100</strong>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8', marginTop: '1.25rem', fontWeight: 300 }}>
            ✨ Multi-Agent checked pricing across 3 networks. Lowest rate highlighted dynamically in your Daily workspace panel.
          </p>
        </div>
      </section>

      {/* Destinations Gallery Section */}
      <section className={styles.gallerySection}>
        <div className={styles.sectionHeader}>
          <h2>Explore Popular Destinations</h2>
          <p>Get inspired by top travel hubs planned dynamically by WanderAI.</p>
        </div>
        <div className={styles.galleryGrid}>
          {destinations.map((dest, idx) => (
            <div key={idx} className={styles.galleryCard}>
              <div className={styles.cardCover} style={{ backgroundImage: `url(${dest.image})` }}>
                <span className={styles.cardTag}>{dest.tag}</span>
              </div>
              <div className={styles.cardDetails}>
                <h3>{dest.name}</h3>
                <p>{dest.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Inspiring Quotes Carousel Card */}
      <section className={styles.quotesSection}>
        <div className={styles.quoteCard}>
          <div className={styles.quoteGlow} />
          <p className={styles.quoteText}>"The world is a book and those who do not travel read only one page."</p>
          <span className={styles.quoteAuthor}>— Saint Augustine</span>
        </div>
      </section>

      {/* Swarm Agents Architecture Section */}
      <section className={styles.agentsSection}>
        <div className={styles.sectionHeader}>
          <h2>Meet Your Swarm of AI Travel Agents</h2>
          <p>Specialized nodes collaborating in real-time to curate coordinates, weather reports, and live rates.</p>
        </div>
        <div className={styles.agentsGrid}>
          {agentNodes.map((node, idx) => (
            <div key={idx} className={styles.agentCard}>
              <div className={styles.agentIconWrapper}>{node.icon}</div>
              <h3>{node.name}</h3>
              <p>{node.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Section */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <MapPin size={24} style={{ color: '#8b5cf6' }} />
          <span>WanderAI</span>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Autonomous Multi-Agent Travel Planner © 2026. Made for premium performance.
        </p>
      </footer>
    </div>
  );
}
