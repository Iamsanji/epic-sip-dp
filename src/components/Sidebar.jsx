import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  QrCode, 
  UserPlus, 
  Users, 
  Clock,
  BookOpen,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut
} from 'lucide-react';

const iconMap = {
  dashboard: LayoutDashboard,
  scanner: QrCode,
  register: UserPlus,
  students: Users,
  logs: Clock,
  book: BookOpen,
  session: PlayCircle,
};

const Sidebar = ({ currentPage, setCurrentPage, onLogout, currentUser, navItems = [] }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile overlay */}
      <div className={`fixed inset-0 bg-black/50 z-20 transition-opacity lg:hidden ${
        !isCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`} onClick={() => setIsCollapsed(true)} />
      
      <aside className={`
        fixed lg:relative z-30
        bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900
        text-white h-screen transition-all duration-300 ease-in-out
        flex flex-col shadow-2xl border-r border-gray-700
        ${isCollapsed ? 'w-20' : 'w-72'}
      `}>
        {/* Header with toggle button */}
        <div className="relative p-5 border-b border-gray-700">
          <div className={`flex items-center gap-3 transition-all duration-300 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}>
            {!isCollapsed && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <span className="text-xl font-bold">A</span>
                  </div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Attendance Alert
                  </h1>
                </div>
              </>
            )}
            {isCollapsed && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg mx-auto">
                <span className="text-xl font-bold">A</span>
              </div>
            )}
          </div>
          
          {/* Toggle button */}
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-8 bg-gray-700 hover:bg-gray-600 rounded-full p-1.5 shadow-lg transition-all duration-200 border border-gray-600"
          >
            {isCollapsed ? (
              <ChevronRight size={18} className="text-white" />
            ) : (
              <ChevronLeft size={18} className="text-white" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive = currentPage === item.key;
              
              return (
                <li key={item.key}>
                  <button
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl
                      font-medium transition-all duration-200 group relative
                      ${isCollapsed ? 'justify-center' : ''}
                      ${isActive
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                    onClick={() => {
                      setCurrentPage(item.key);
                      if (window.innerWidth < 1024) setIsCollapsed(true);
                    }}
                  >
                    <Icon size={22} className={`${isActive ? 'text-white' : item.color} transition-transform group-hover:scale-110`} />
                    
                    {!isCollapsed && (
                      <span className="flex-1 text-left">{item.label}</span>
                    )}
                    
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                        {item.label}
                      </div>
                    )}
                    
                    {isActive && !isCollapsed && (
                      <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer actions */}
        <div className="border-t border-gray-700 p-4 space-y-2">
          {!isCollapsed && currentUser && (
            <div className="rounded-xl bg-gray-800/70 p-3 text-sm">
              <p className="font-bold text-white">{currentUser.name}</p>
              <p className="text-gray-400 uppercase text-xs tracking-widest">{currentUser.role}</p>
            </div>
          )}

          <button
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              text-gray-300 hover:bg-gray-800 hover:text-white
              transition-all duration-200
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <Settings size={20} />
            {!isCollapsed && <span className="flex-1 text-left">Settings</span>}
          </button>
          
          {onLogout && (
            <button
              onClick={onLogout}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl
                text-red-400 hover:bg-red-500/10 hover:text-red-300
                transition-all duration-200
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <LogOut size={20} />
              {!isCollapsed && <span className="flex-1 text-left">Logout</span>}
            </button>
          )}
          
          {!isCollapsed && (
            <div className="mt-4 pt-4 text-center">
              <p className="text-xs text-gray-500 select-none">
                &copy; 2026 Attendance Alert
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Version 2.0.0
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;