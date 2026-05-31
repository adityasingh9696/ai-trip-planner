import { SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { MapPin } from "lucide-react";
import styles from "./page.module.css";

export default async function Home() {
  const { userId } = await auth();

  return (
    <>
      <header className={styles.header}>
        <div className={styles.logo}>
          <MapPin size={28} />
          <span>WanderAI</span>
        </div>
        <nav className={styles.nav}>
          {!userId ? (
            <SignInButton mode="modal">
              <button className="btn-primary">Sign In</button>
            </SignInButton>
          ) : (
            <>
              <Link href="/dashboard" style={{ marginRight: '1rem', fontWeight: 600 }}>Dashboard</Link>
              <UserButton />
            </>
          )}
        </nav>
      </header>

      <main className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>Your Perfect Trip, Planned in Seconds.</h1>
          <p className={styles.subtitle}>
            Stop spending weeks researching. Tell us your budget, dates, and dreams, 
            and our AI will generate a hyper-personalized itinerary mapped out just for you.
          </p>
          
          <div className={styles.ctaContainer}>
            {userId ? (
              <Link href="/plan" className={styles.ctaPrimary}>
                Start Planning Now
              </Link>
            ) : (
              <SignInButton mode="modal">
                <button className={styles.ctaPrimary}>
                  Get Started for Free
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
