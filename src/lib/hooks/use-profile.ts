"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Profile {
  name: string;
  email: string;
  /** the picture a provider gave us, if any */
  avatar: string | null;
  initials: string;
}

function initialsFrom(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (email.slice(0, 2) || "NE").toUpperCase();
}

/**
 * Who is signed in, from the auth user rather than a table.
 *
 * Google hands back a name and a picture in the user metadata, so
 * neither needs a column of its own, and an account created with
 * an email still gets sensible initials.
 */
export function useProfile(): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return;
      const m = data.user.user_metadata ?? {};
      const email = data.user.email ?? "";
      const name = String(m.full_name || m.name || "").trim();

      setProfile({
        name,
        email,
        avatar: (m.avatar_url || m.picture || null) as string | null,
        initials: initialsFrom(name, email),
      });
    });

    return () => { alive = false; };
  }, []);

  return profile;
}
