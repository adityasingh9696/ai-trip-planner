"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { MapPin, Calendar, DollarSign, ArrowRight, Compass, ShieldAlert, Navigation } from "lucide-react";
import styles from "../plan/page.module.css";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();

  // Live Convex Database Synchronization hooks
  const storeUser = useMutation(api.users.store);
  const currentUser = useQuery(api.users.getCurrentUser, user ? { clerkId: user.id } : "skip");
  const trips = useQuery(api.trips.getUserTrips, currentUser ? { userId: currentUser._id } : "skip");

  useEffect(() => {
    if (user) {
      storeUser({ clerkId: user.id, email: user.emailAddresses[0]?.emailAddress || "" });
    }
  }, [user, storeUser]);

  if (!isLoaded) {
    return (
      <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>Synchronizing workspace...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
        <div className={styles.formCard} style={{ maxWidth: '400px' }}>
          <ShieldAlert size={48} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>Access Restricted</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Please sign in to access your personal travel records.</p>
          <Link href="/" className={styles.submitBtn}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <Link href="/" className={styles.backLink}>
        <ArrowLeftWrapper /> Back Home
      </Link>

      <div className={styles.header} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: '2.75rem', background: 'linear-gradient(135deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, letterSpacing: '-0.025em' }}>Your Travel Workspace</h1>
          <p style={{ color: '#94a3b8', fontWeight: 300, fontSize: '1.15rem', marginTop: '0.25rem' }}>Welcome back, {user.firstName || "Traveler"}. Manage and load your personal generated itineraries.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/admin" className={styles.toolBtn} style={{ textDecoration: 'none' }}>
            🛡️ Admin Operations
          </Link>
          <Link href="/plan" className={styles.submitBtn} style={{ padding: '12px 24px', fontSize: '0.95rem', boxShadow: 'none', textDecoration: 'none' }}>
            Plan New Adventure
          </Link>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, marginTop: '2.5rem' }}>
        {trips && trips.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
            {trips.map((trip: any) => (
              <div key={trip._id} className={styles.hotelCard} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className={styles.hotelCover} style={{ height: '120px', background: 'linear-gradient(135deg, #7c3aed, #c084fc)', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Navigation size={40} style={{ color: '#fff', opacity: 0.6 }} />
                </div>
                <div className={styles.hotelInfo} style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>{trip.destination}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
                    <Calendar size={16} style={{ color: '#a78bfa' }} /> 
                    <span>{trip.startDate} to {trip.endDate}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
                    <DollarSign size={16} style={{ color: '#10b981' }} /> 
                    <span style={{ fontWeight: 600 }}>{trip.budget}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Created: {new Date(trip.createdAt).toLocaleDateString()}</span>
                    <Link href={`/plan?load=${trip._id}`} className={styles.toolBtn} style={{ padding: '6px 12px', fontSize: '0.85rem', textDecoration: 'none' }}>
                      Load Plan <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.resultCard} style={{ textAlign: 'center', padding: '5rem 2rem', borderStyle: 'dashed' }}>
            <Compass size={64} style={{ color: 'rgba(255,255,255,0.05)', margin: '0 auto 1.5rem', animation: 'spin 180s infinite linear' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>No trips planned yet</h3>
            <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '400px', margin: '0 auto 1.5rem', fontWeight: 300 }}>Generate your first personalized trip, and our Multi-Agent systems will archive them safely here.</p>
            <Link href="/plan" className={styles.submitBtn} style={{ display: 'inline-flex', width: 'auto', padding: '12px 30px', textDecoration: 'none' }}>
              Start Planning Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ArrowLeftWrapper() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left">
      <path d="m12 19-7-7 7-7"/>
      <path d="M19 12H5"/>
    </svg>
  );
}
