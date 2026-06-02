"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false, 
  loading: () => <div style={{ width: "100%", height: "400px", background: '#eee', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div> 
});
import styles from "./page.module.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PlanPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<any>(null);
  const [destinationImage, setDestinationImage] = useState<string | null>(null);
  
  // NOTE: In a real app, Convex types would be generated. We assume the mutation exists.
  // const createTrip = useMutation(api.trips.createTrip);

  const [formData, setFormData] = useState({
    destination: "",
    days: "3",
    budget: "Moderate",
    companions: "Solo",
    interests: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${backendUrl}/api/generate-trip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Failed to generate" }));
        throw new Error(errData.error || "Failed to generate");
      }

      const data = await res.json();
      setItinerary(data);

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

      // if (user) {
      //   await createTrip({
      //     userId: user.id as any, // Needs proper clerk mapping in Convex
      //     destination: formData.destination,
      //     startDate: new Date().toISOString(),
      //     endDate: new Date(Date.now() + parseInt(formData.days) * 86400000).toISOString(),
      //     budget: formData.budget,
      //     itineraryData: data,
      //   });
      // }

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error generating itinerary.");
    } finally {
      setLoading(false);
    }
  };

  const getLocations = () => {
    if (!itinerary) return [];
    const locs: any[] = [];
    itinerary.itinerary.forEach((day: any) => {
      day.activities.forEach((act: any) => {
        if (act.location && act.location.lat && act.location.lng) {
          locs.push({ lat: act.location.lat, lng: act.location.lng, name: act.name });
        }
      });
    });
    return locs;
  };

  return (
    <div className={styles.container}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', fontWeight: 600 }}>
        <ArrowLeft size={20} /> Back Home
      </Link>
      
      <div className={styles.header}>
        <h1>Plan Your Next Adventure</h1>
        <p>Fill out the details below and let AI craft your perfect trip.</p>
      </div>

      <div className={styles.layout}>
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Destination</label>
              <input 
                type="text" 
                required 
                className={styles.input} 
                placeholder="e.g. Tokyo, Japan"
                value={formData.destination}
                onChange={e => setFormData({...formData, destination: e.target.value})}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Number of Days</label>
              <input 
                type="number" 
                min="1" max="14" 
                required 
                className={styles.input}
                value={formData.days}
                onChange={e => setFormData({...formData, days: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Budget</label>
              <select className={styles.select} value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})}>
                <option value="Budget">Budget / Backpacker</option>
                <option value="Moderate">Moderate / Standard</option>
                <option value="Luxury">Luxury / Premium</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Who are you traveling with?</label>
              <select className={styles.select} value={formData.companions} onChange={e => setFormData({...formData, companions: e.target.value})}>
                <option value="Solo">Solo</option>
                <option value="Couple">Couple</option>
                <option value="Family with kids">Family with kids</option>
                <option value="Group of friends">Group of friends</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Interests (Optional)</label>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="e.g. History, Food, Hiking"
                value={formData.interests}
                onChange={e => setFormData({...formData, interests: e.target.value})}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Generating..." : "Generate Itinerary"}
            </button>
          </form>
        </div>

        <div className={styles.resultCard}>
          {itinerary ? (
            <div>
              {destinationImage && (
                <div style={{ width: '100%', height: '250px', marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden', backgroundImage: `url(${destinationImage})`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'var(--shadow-md)' }} />
              )}
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{itinerary.tripDetails?.destination}</h2>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '1.5rem' }}>Total Estimated Cost: {itinerary.tripDetails?.totalEstimatedCost}</div>
              <Map locations={getLocations()} />
              
              <div style={{ marginTop: '2rem' }}>
                {itinerary.itinerary?.map((day: any) => (
                  <div key={day.day} className={styles.dayContainer}>
                    <h3 className={styles.dayTitle}>Day {day.day}: {day.theme}</h3>
                    {day.activities.map((act: any, idx: number) => (
                      <div key={idx} className={styles.activity}>
                        <div className={styles.activityHeader}>
                          <span className={styles.activityTime}>{act.time}</span>
                          <span>{act.name}</span>
                        </div>
                        <p className={styles.activityDesc}>{act.description}</p>
                        <div className={styles.activityCost}>Est. Cost: {act.cost}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              Your generated itinerary and map will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
