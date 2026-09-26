import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SearchInput } from '../components/ui/SearchInput';
import {
  LayoutDashboard,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Sliders,
  History,
  Building2,
  MapPin,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../utils/cn';

export const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('WH01');

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navSections = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Products', path: '/products', icon: Package },
        { label: 'Stock Levels', path: '/stock', icon: Layers },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Receipts', path: '/operations/receipts', icon: ArrowDownLeft, badge: '12' },
        { label: 'Deliveries', path: '/operations/deliveries', icon: ArrowUpRight, badge: '8' },
        { label: 'Internal Transfers', path: '/operations/transfers', icon: ArrowRightLeft },
        { label: 'Adjustments', path: '/operations/adjustments', icon: Sliders },
      ],
    },
    {
      title: 'Audit',
      items: [
        { label: 'Move History', path: '/move-history', icon: History },
      ],
    },
    {
      title: 'Configuration',
      items: [
        { label: 'Warehouses', path: '/settings/warehouses', icon: Building2 },
        { label: 'Locations', path: '/settings/locations', icon: MapPin },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Profile Settings', path: '/profile', icon: User },
      ],
    },
  ];

  // Helper to format breadcrumb from pathname
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return ['Main', 'Dashboard'];
    if (path.startsWith('/products')) {
      if (path.endsWith('/new')) return ['Inventory', 'Products', 'Create New Product'];
      if (path.split('/').length > 2) return ['Inventory', 'Products', 'Product Details'];
      return ['Inventory', 'Products'];
    }
    if (path.startsWith('/stock')) return ['Inventory', 'Stock Levels'];
    if (path.startsWith('/operations/receipts')) {
      if (path.endsWith('/new')) return ['Operations', 'Receipts', 'New Inbound Receipt'];
      if (path.split('/').length > 3) return ['Operations', 'Receipts', 'Receipt Detail'];
      return ['Operations', 'Receipts', 'Live Inbound Pipeline'];
    }
    if (path.startsWith('/operations/deliveries')) {
      if (path.endsWith('/new')) return ['Operations', 'Deliveries', 'New Outbound Delivery'];
      if (path.split('/').length > 3) return ['Operations', 'Deliveries', 'Delivery Detail'];
      return ['Operations', 'Deliveries', 'Outbound Queue'];
    }
    if (path.startsWith('/operations/transfers')) {
      if (path.endsWith('/new')) return ['Operations', 'Transfers', 'New Internal Transfer'];
      if (path.split('/').length > 3) return ['Operations', 'Transfers', 'Transfer Detail'];
      return ['Operations', 'Transfers'];
    }
    if (path.startsWith('/operations/adjustments')) {
      if (path.endsWith('/new')) return ['Operations', 'Adjustments', 'New Stock Adjustment'];
      if (path.split('/').length > 3) return ['Operations', 'Adjustments', 'Adjustment Detail'];
      return ['Operations', 'Adjustments'];
    }
    if (path.startsWith('/move-history')) return ['Audit', 'Move History & Audit Trail'];
    if (path.startsWith('/settings/warehouses')) return ['Configuration', 'Warehouse Facilities'];
    if (path.startsWith('/settings/locations')) return ['Configuration', 'Locations & Bins'];
    if (path.startsWith('/profile')) return ['Account', 'User Profile & Security'];
    return ['Application', 'Overview'];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <header
        className={cn(
          'fixed top-0 right-0 h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 z-40 px-4 flex items-center justify-between transition-all duration-300',
          collapsed ? 'left-16' : 'left-64 md:left-64',
          'left-0 md:left-64'
        )}
      >
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          {/* Mobile drawer toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb path */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                <span
                  className={cn(
                    idx === breadcrumbs.length - 1 ? 'text-white font-semibold' : 'hover:text-blue-400 transition-colors'
                  )}
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Global Search */}
          <div className="hidden lg:block w-72">
            <SearchInput placeholder="Search SKUs, references..." />
          </div>

          {/* Warehouse Selector */}
          <div className="relative">
            <button
              onClick={() => setSelectedWarehouse(selectedWarehouse === 'WH01' ? 'WH02' : 'WH01')}
              className="h-8 px-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
            >
              <Warehouse className="w-3.5 h-3.5 text-blue-400" />
              <span>{selectedWarehouse === 'WH01' ? 'Main WH [WH01]' : 'North WH [WH02]'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Notification Bell */}
          <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </button>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 pl-2 border-l border-slate-800 text-left hover:opacity-90"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold text-xs">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="hidden xl:flex flex-col">
                <span className="text-xs font-semibold text-white leading-tight">
                  {profile?.full_name || 'StockSense User'}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {profile?.role === 'manager' ? 'Inventory Mgr' : 'Staff'}
                </span>
              </div>
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-white truncate">{profile?.full_name || 'StockSense User'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-blue-400" /> Profile & Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-slate-800"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Lateral Sidebar (Desktop) */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-800 z-50 flex flex-col justify-between transition-all duration-300 hidden md:flex',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Brand Header */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold text-white text-base shadow-md">
                S
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-white tracking-tight leading-tight">StockSense</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest leading-tight">Enterprise WMS</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            {navSections.map((sec, sIdx) => (
              <div key={sIdx} className="space-y-1">
                {!collapsed && (
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {sec.title}
                  </div>
                )}
                {sec.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  return (
                    <NavLink
                      key={iIdx}
                      to={item.path}
                      className={({ isActive: linkActive }) =>
                        cn(
                          'flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all group',
                          linkActive || isActive
                            ? 'bg-blue-600 text-white font-semibold shadow-sm'
                            : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                        )
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200')} />
                        {!collapsed && <span>{item.label}</span>}
                      </div>
                      {!collapsed && item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer User Info */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              {!collapsed && (
                <span className="text-[11px] text-slate-400 truncate">Systems Operational</span>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm md:hidden flex">
          <div className="w-64 bg-slate-900 border-r border-slate-800 h-full flex flex-col justify-between p-4">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-blue-600 text-white font-bold flex items-center justify-center">S</div>
                  <span className="font-bold text-white text-sm">StockSense WMS</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 overflow-y-auto max-h-[80vh]">
                {navSections.map((sec, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-1">
                      {sec.title}
                    </div>
                    {sec.items.map((item, iIdx) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={iIdx}
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium',
                              isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800'
                            )
                          }
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Canvas */}
      <main
        className={cn(
          'relative pt-14 bg-slate-950 min-h-screen w-full transition-all duration-300 flex-1 flex flex-col',
          collapsed ? 'md:pl-16' : 'md:pl-64'
        )}
      >
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
