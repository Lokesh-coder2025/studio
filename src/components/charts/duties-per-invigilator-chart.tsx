
'use client';

import { useMemo } from 'react';
import type { SavedAllotment } from '@/types';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

type ChartProps = {
  data: SavedAllotment;
};

export function DutiesPerInvigilatorChart({ data }: ChartProps) {
  const chartData = useMemo(() => {
    const dutyCounts: { [name: string]: number } = {};
    data.invigilators.forEach(inv => {
      dutyCounts[inv.name] = 0;
    });

    data.assignments.forEach(assignment => {
      assignment.invigilators.forEach(invigilatorName => {
        if (dutyCounts.hasOwnProperty(invigilatorName)) {
          dutyCounts[invigilatorName]++;
        }
      });
    });

    return Object.entries(dutyCounts).map(([name, duties]) => ({ name, duties }));
  }, [data]);
  
  const chartConfig = {
    duties: {
      label: 'Duties',
      color: 'hsl(var(--chart-3))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duties Per Invigilator</CardTitle>
        <CardDescription>Total duties assigned to each staff member.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={100}
                style={{ fontSize: '10px' }}
              />
              <YAxis />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar dataKey="duties" fill="var(--color-duties)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
