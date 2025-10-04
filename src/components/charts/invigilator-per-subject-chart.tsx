
'use client';

import { useMemo } from 'react';
import type { SavedAllotment } from '@/types';
import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChartProps = {
  data: SavedAllotment;
  onTitleClick?: (chart: React.ReactNode) => void;
  isZoomed?: boolean;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d', '#4dff4d', '#4d4dff'];

export function InvigilatorsPerSubjectChart({ data, onTitleClick, isZoomed }: ChartProps) {
  const { chartData, chartConfig } = useMemo(() => {
    if (!data) return { chartData: [], chartConfig: {} };

    const subjectCounts: { [subject: string]: number } = {};
    data.assignments.forEach(assignment => {
      if (!subjectCounts[assignment.subject]) {
        subjectCounts[assignment.subject] = 0;
      }
      subjectCounts[assignment.subject] += assignment.invigilators.length;
    });

    const formattedData = Object.entries(subjectCounts).map(([subject, count]) => ({
      subject,
      count,
    }));
    
    const config = formattedData.reduce((acc, item, index) => {
        acc[item.subject] = {
            label: item.subject,
            color: COLORS[index % COLORS.length]
        }
        return acc;
    }, {} as any)

    return { chartData: formattedData, chartConfig: config };
  }, [data]);

  const chartComponent = (
     <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
        <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
            data={chartData}
            dataKey="count"
            nameKey="subject"
            cx="50%"
            cy="50%"
            outerRadius={isZoomed ? 180 : 100}
            labelLine={false}
            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x  = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy  + radius * Math.sin(-midAngle * RADIAN);
                return (
                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontWeight="bold">
                    {`${(percent * 100).toFixed(0)}%`}
                </text>
                );
            }}
            >
                {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
            </Pie>
            <ChartLegend 
                content={<ChartLegendContent nameKey="subject" className={cn("grid gap-x-8 gap-y-2", isZoomed ? 'grid-cols-2' : '')} />} 
            />
        </PieChart>
        </ResponsiveContainer>
    </ChartContainer>
  );


  if (isZoomed) {
    return chartComponent;
  }

  return (
    <Card className="flex flex-col">
      <CardHeader 
        className="cursor-pointer group"
        onClick={() => onTitleClick && onTitleClick(<InvigilatorsPerSubjectChart data={data} isZoomed />)}
      >
        <div className="flex items-center justify-between">
            <CardTitle>Invigilator Allocation per Subject</CardTitle>
            <Maximize className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <CardDescription>Distribution of total invigilator duties across subjects.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <div className="mx-auto aspect-square h-[300px]">
            {chartComponent}
        </div>
      </CardContent>
    </Card>
  );
}
