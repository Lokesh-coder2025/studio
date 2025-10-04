
'use client';

import { useMemo } from 'react';
import type { SavedAllotment } from '@/types';
import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

type ChartProps = {
  data: SavedAllotment;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d', '#4dff4d', '#4d4dff'];

export function InvigilatorsPerSubjectChart({ data }: ChartProps) {
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

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Invigilator Allocation per Subject</CardTitle>
        <CardDescription>Distribution of total invigilator duties across subjects.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="subject"
                cx="50%"
                cy="50%"
                outerRadius={80}
                labelLine={false}
                label={({ cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x  = cy + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy  + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="white" textAnchor={x > cy ? 'start' : 'end'} dominantBaseline="central">
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                 {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="subject" />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
