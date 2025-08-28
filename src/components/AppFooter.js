import React from "react";
import { Link } from "react-router-dom";
import {
  Droplet,
  MapPin,
  HeartHandshake,
  Mail,
  Phone,
  Github,
} from "lucide-react";

export default function AppFooter() {
  return (
    <footer className="mt-12 bg-gradient-to-br from-red-400  text-black">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
        {/* Quick actions */}
        <div>
          <h4 className="font-bold mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <Link to="/request-blood" className="flex items-center gap-2 hover:underline font-semibold">
              <Droplet className="w-4 h-4" />
              Request Blood
            </Link>
            <Link to="/schedule-donation" className="flex items-center gap-2 hover:underline">
              <HeartHandshake className="w-4 h-4" />
              Become a Donor
            </Link>
            <a href="#find" className="flex items-center gap-2 hover:underline">
              <MapPin className="w-4 h-4" />
              Find Blood Bank
            </a>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-bold mb-3">Contact</h4>
          <ul className="space-y-2">
            <li>
              <a className="inline-flex items-center gap-2 hover:underline" href="mailto:hello@example.com">
                <Mail className="w-4 h-4" /> amarrokto@gmail.com
              </a>
            </li>
            <li>
              <a className="inline-flex items-center gap-2 hover:underline" href="tel:+8801000000000">
                <Phone className="w-4 h-4" /> 01378233215
              </a>
            </li>
          </ul>
        </div>

        {/* Project / social */}
        <div>
          <h4 className="font-bold mb-3">Project</h4>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/30 hover:bg-white/10 text-sm"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a href="#top" className="ml-auto text-xs hover:underline opacity-90">
              Back to top
            </a>
          </div>
          <p className="mt-3 text-xs opacity-90">
            © {new Date().getFullYear()} Amar Rokto — All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
