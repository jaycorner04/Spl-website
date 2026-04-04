import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import RouteAction from "../common/RouteAction";

const quickLinks = [
  { name: "Home", path: "/" },
  { name: "Fixtures", path: "/fixtures" },
  { name: "Teams", path: "/teams" },
  { name: "Players", path: "/players" },
  { name: "Live", path: "/live" },
  { name: "Admin", path: "/admin" },
];

const legalLinks = [
  { name: "Privacy Policy", path: "#" },
  { name: "Terms & Conditions", path: "#" },
  { name: "Support", path: "#" },
];

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Youtube, href: "#", label: "Youtube" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[linear-gradient(135deg,rgba(165,90,117,0.22)_0%,rgba(95,36,57,0.96)_24%,rgba(54,16,31,0.98)_72%,rgba(133,57,83,0.24)_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="font-heading text-4xl tracking-[0.16em] text-white">
              SPL <span className="text-[#ffd9e8]">RAYNX</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
              Software Premier League is a premium internal cricket-inspired
              software competition platform built for teams, players, admins,
              and fan engagement.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition-all duration-300 hover:border-[#c86d93]/40 hover:bg-[#853953]/18 hover:text-[#ffd9e8]"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-condensed text-2xl uppercase tracking-[0.14em] text-[#ffd9e8]">
              Quick Links
            </h3>
            <ul className="mt-5 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <RouteAction
                    to={link.path}
                    className="text-sm text-slate-300 transition hover:text-[#ffd9e8]"
                  >
                    {link.name}
                  </RouteAction>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-condensed text-2xl uppercase tracking-[0.14em] text-[#ffd9e8]">
              Legal
            </h3>
            <ul className="mt-5 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.path}
                    className="text-sm text-slate-300 transition hover:text-[#ffd9e8]"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-condensed text-2xl uppercase tracking-[0.14em] text-[#ffd9e8]">
              Contact
            </h3>

            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 text-[#f0b4cb]" size={18} />
                <p className="text-sm leading-6 text-slate-300">
                  Raynx Systems Pvt Ltd,
                  <br />
                  India
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="text-[#f0b4cb]" size={18} />
                <a
                  href="mailto:support@splraynx.com"
                  className="text-sm text-slate-300 transition hover:text-[#ffd9e8]"
                >
                  support@splraynx.com
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="text-[#f0b4cb]" size={18} />
                <a
                  href="tel:+919999999999"
                  className="text-sm text-slate-300 transition hover:text-[#ffd9e8]"
                >
                  +91 99999 99999
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p className="text-sm text-slate-400">
              © 2026 SPL Raynx. All rights reserved.
            </p>

            <p className="text-sm text-slate-400">
      Season 1 · Software Premier League
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
