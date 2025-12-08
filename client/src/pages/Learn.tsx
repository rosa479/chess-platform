import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { BookOpen, Video, Award, ChevronRight } from 'lucide-react';

const courses = [
  {
    title: 'Chess Fundamentals',
    description: 'Master the basics of chess',
    progress: 65,
    lessons: 12,
    icon: '♟️',
  },
  {
    title: 'Opening Principles',
    description: 'Learn key opening strategies',
    progress: 30,
    lessons: 8,
    icon: '♙',
  },
  {
    title: 'Tactical Patterns',
    description: 'Forks, pins, and skewers',
    progress: 0,
    lessons: 15,
    icon: '⚔️',
  },
  {
    title: 'Endgame Mastery',
    description: 'Convert winning positions',
    progress: 0,
    lessons: 10,
    icon: '👑',
  },
];

const Learn = () => {
  return (
    <MainLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Learn Chess</h1>
          <p className="text-muted-foreground">Improve your game with structured lessons and courses</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-lg p-5 flex items-center gap-4 hover-lift cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Lessons</h3>
              <p className="text-sm text-muted-foreground">Interactive tutorials</p>
            </div>
          </div>
          <div className="bg-card rounded-lg p-5 flex items-center gap-4 hover-lift cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Video className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Videos</h3>
              <p className="text-sm text-muted-foreground">Master classes</p>
            </div>
          </div>
          <div className="bg-card rounded-lg p-5 flex items-center gap-4 hover-lift cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-chess-highlight/20 flex items-center justify-center">
              <Award className="w-6 h-6 text-chess-highlight" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Achievements</h3>
              <p className="text-sm text-muted-foreground">Track progress</p>
            </div>
          </div>
        </div>

        {/* Courses */}
        <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
        <div className="space-y-4">
          {courses.map((course) => (
            <div 
              key={course.title}
              className="bg-card rounded-lg p-5 flex items-center justify-between hover-lift cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center text-2xl">
                  {course.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-32 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {course.progress}% • {course.lessons} lessons
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Learn;
