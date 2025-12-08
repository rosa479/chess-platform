import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Bot, BookOpen, BarChart3, Settings, Database, Cpu, ChevronRight } from 'lucide-react';

const tools = [
  {
    icon: Bot,
    title: 'AI Analysis',
    description: 'Get engine evaluation and best moves for any position',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: BookOpen,
    title: 'Opening Explorer',
    description: 'Browse opening theory and popular variations',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  {
    icon: BarChart3,
    title: 'Game Report',
    description: 'Detailed analysis of your played games',
    color: 'text-chess-highlight',
    bgColor: 'bg-chess-highlight/10',
  },
  {
    icon: Database,
    title: 'Database Search',
    description: 'Search millions of master games',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  {
    icon: Cpu,
    title: 'Board Editor',
    description: 'Set up custom positions for analysis',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  {
    icon: Settings,
    title: 'Practice Mode',
    description: 'Train against the computer at any level',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

const Tools = () => {
  return (
    <MainLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Chess Tools</h1>
          <p className="text-muted-foreground">Powerful tools to improve your game</p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-2 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.title}
              className="bg-card rounded-xl p-6 cursor-pointer hover-lift group"
            >
              <div className="flex items-start justify-between">
                <div className={`w-14 h-14 rounded-xl ${tool.bgColor} flex items-center justify-center mb-4`}>
                  <tool.icon className={`w-7 h-7 ${tool.color}`} />
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{tool.title}</h3>
              <p className="text-muted-foreground">{tool.description}</p>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-10 bg-card rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Your Analysis Stats</h2>
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'Games Analyzed', value: '47' },
              { label: 'Avg. Accuracy', value: '78%' },
              { label: 'Top Mistakes', value: 'Endgames' },
              { label: 'Improvement', value: '+12%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Tools;
