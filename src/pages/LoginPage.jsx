import React, { useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { authenticateUser, setCurrentUser } from "../utils/localStorageUtils";

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = authenticateUser(username, password);

    if (!user) {
      setMessage("Invalid username or password.");
      return;
    }

    setCurrentUser(user);
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/95 rounded-3xl shadow-2xl p-8 border border-white/70">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 rounded-2xl">
            <ShieldCheck className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Attendance Alert</h1>
            <p className="text-sm text-slate-500">Sign in to continue</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
          Demo Accounts: admin/admin123, teacher/teacher123, student/student123
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white p-3 font-bold flex items-center justify-center gap-2"
          >
            <LogIn size={18} /> Sign In
          </button>

          {message && <p className="text-sm font-semibold text-red-600">{message}</p>}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
