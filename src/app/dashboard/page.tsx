"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { MapPin, Calendar, DollarSign, ArrowRight } from "lucide-react";
import styles from "../plan/page.module.css"; // Reuse some styles

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  // In a real implementation we would query by clerkId, assuming proper DB sync.
  // const trips = useQuery(api.trips.getUserTrips, user ? { userId: user.id as any } : "skip");
  const trips: any[] = []; // Mocked for now until DB is synced with user

  if (!isLoaded) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!user) return <div style={{ padding: '2rem', textAlign: 'center' }}>Please sign in to view your dashboard.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Your Dashboard</h1>
          <p>Welcome back, {user.firstName || "Traveler"}. Manage your upcoming and past trips here.</p>
        </div>
        <Link href="/plan" className="btn-primary" style={{ textDecoration: 'none' }}>
          Create New Trip
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {trips && trips.length > 0 ? trips.map((trip: any) => (
          <div key={trip._id} className={styles.resultCard} style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
              {trip.destination}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
              <Calendar size={16} /> 
              <span>{new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
              <DollarSign size={16} /> 
              <span>{trip.budget} Budget</span>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                View <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )) : (
          <div className={styles.resultCard} style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
            <MapPin size={48} color="var(--color-border)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>No trips planned yet</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Your generated itineraries will be saved here automatically.</p>
            <Link href="/plan" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Start Planning
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
