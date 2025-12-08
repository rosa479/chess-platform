import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Users, MessageCircle, Trophy, Calendar, ChevronRight } from 'lucide-react';

const clubs = [
  { name: 'Chess Enthusiasts', members: 15420, active: true },
  { name: 'Blitz Warriors', members: 8932, active: true },
  { name: 'Endgame Study Group', members: 3421, active: false },
];

const recentPosts = [
  { author: 'ChessMaster99', title: 'Best opening for beginners?', replies: 42, time: '2h ago' },
  { author: 'TacticsKing', title: 'My journey to 2000 rating', replies: 156, time: '5h ago' },
  { author: 'Pawn_Pusher', title: 'Analyzing the London System', replies: 28, time: '1d ago' },
];

const Community = () => {
  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Community</h1>
          <p className="text-muted-foreground">Connect with chess players worldwide</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Forums Section */}
          <div className="col-span-2 space-y-6">
            <div className="bg-card rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <MessageCircle size={20} className="text-primary" />
                  Recent Discussions
                </h2>
                <button className="text-sm text-primary hover:underline">View All</button>
              </div>

              <div className="space-y-4">
                {recentPosts.map((post, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer group"
                  >
                    <div>
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        by {post.author} • {post.replies} replies
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{post.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Tournaments */}
            <div className="bg-card rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Trophy size={20} className="text-chess-highlight" />
                  Upcoming Tournaments
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Weekend Blitz', date: 'Dec 14', players: 128, prize: '$500' },
                  { name: 'Rapid Championship', date: 'Dec 21', players: 256, prize: '$1000' },
                ].map((tournament) => (
                  <div key={tournament.name} className="bg-secondary rounded-lg p-4 hover-lift cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar size={14} />
                      {tournament.date}
                    </div>
                    <h3 className="font-semibold text-foreground">{tournament.name}</h3>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-muted-foreground">{tournament.players} players</span>
                      <span className="text-accent font-medium">{tournament.prize}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Clubs Sidebar */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Users size={20} className="text-accent" />
                Your Clubs
              </h2>

              <div className="space-y-3">
                {clubs.map((club) => (
                  <div 
                    key={club.name}
                    className="flex items-center justify-between py-2 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg">
                        ♞
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {club.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">{club.members.toLocaleString()} members</p>
                      </div>
                    </div>
                    {club.active && (
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    )}
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 btn-outline text-sm">
                Browse Clubs
              </button>
            </div>

            {/* Friends Online */}
            <div className="bg-card rounded-lg p-6">
              <h2 className="font-semibold mb-4">Friends Online</h2>
              <div className="space-y-3">
                {['Alice_Chess', 'BobGambit', 'CharlieKnight'].map((friend) => (
                  <div key={friend} className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        👤
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-card" />
                    </div>
                    <span className="text-sm">{friend}</span>
                    <button className="ml-auto text-xs text-primary hover:underline">Challenge</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Community;
