import React, { useEffect, useState } from 'react';
import { Announcement } from '../../types';
import { Volume2, Sparkles, Megaphone, Calendar } from 'lucide-react';

export const AnnouncementsTab: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Banner */}
      <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-yellow-500 font-bold text-xs uppercase tracking-widest">
            <Megaphone className="w-4 h-4 text-yellow-500" />
            <span>Casino News</span>
          </div>
          <h2 className="text-xl font-black text-white mt-0.5">
            Announcements
          </h2>
        </div>
        <Volume2 className="w-8 h-8 text-yellow-500 animate-bounce" />
      </div>

      {/* Announcements List */}
      <div className="space-y-2">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-8 text-center text-xs text-gray-500">
            No announcements broadcasted yet.
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-[#0d0d0f] border border-white/5 rounded-2xl p-4 shadow-2xl space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-1.5 text-yellow-500">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span className="text-white">{ann.title}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 uppercase">
                  {ann.type}
                </span>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed bg-[#121214] p-3 rounded-xl border border-white/5">
                {ann.content}
              </p>

              <div className="flex items-center gap-1 text-[10px] font-mono text-gray-500 justify-end">
                <Calendar className="w-3 h-3" />
                <span>{(ann.createdAt || ann.timestamp) ? new Date(ann.createdAt || ann.timestamp).toLocaleString() : ''}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
