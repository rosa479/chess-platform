import React from 'react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { 
  Gamepad2, 
  Puzzle, 
  GraduationCap, 
  Eye, 
  Users, 
  Wrench, 
  User,
  Globe,
  HelpCircle,
  Crown
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const navItems = [
  { icon: Gamepad2, label: 'Play', path: '/' },
  { icon: Puzzle, label: 'Puzzles', path: '/puzzles' },
  { icon: GraduationCap, label: 'Learn', path: '/learn' },
  { icon: Eye, label: 'Watch', path: '/watch' },
  { icon: Users, label: 'Community', path: '/community' },
  { icon: Wrench, label: 'Tools', path: '/tools' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  return (
    <aside className={cn(
      "w-52 min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border",
      className
    )}>
      {/* Logo */}
      <div className="p-4">
        <NavLink to="/" className="flex items-center gap-2 group">
          <Crown className="w-8 h-8 text-primary" />
          <span className="font-bold text-lg text-foreground">
            Chess<span className="text-primary">TSG</span>
          </span>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="sidebar-item"
            activeClassName="sidebar-item-active"
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Auth Buttons */}
      <div className="p-4 space-y-2">
        <button className="btn-accent w-full">
          Sign Up
        </button>
        <button className="btn-outline w-full">
          Login
        </button>
      </div>

      {/* Footer Links */}
      <div className="px-4 pb-4 space-y-2">
        <button className="sidebar-item w-full">
          <Globe size={18} />
          <span className="text-sm">English</span>
        </button>
        <button className="sidebar-item w-full">
          <HelpCircle size={18} />
          <span className="text-sm">Support</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
