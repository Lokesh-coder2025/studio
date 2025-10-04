
'use client';

import { useMemo } from 'react';
import type { SavedAllotment } from '@/types';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

type ChartProps = {
  data: SavedAllotment;
};

export function InvigilatorsByDesignationChart({ data }: ChartProps) {
  const chartData = useMemo(() => {
    const designationCounts: { [designation: string]: number } = {};
    
    // Use the full invigilator list to get all designations
    data.invigilators.forEach(invigilator => {
        if (!designationCounts[invigilator.designation]) {
          designationCounts[invigilator.designation] = 0;
        }
        designationCounts[invigilator.designation]++;
    });

    return Object.entries(designationCounts).map(([designation, count]) => ({
      designation,
      count,
    }));
  }, [data]);

  const chartConfig = {
    count: {
      label: 'Count',
      color: 'hsl(var(--chart-2))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invigilator Distribution by Designation</CardTitle>
        <CardDescription>Number of invigilators from each department/designation.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 80, left: 20 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="designation"
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
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
