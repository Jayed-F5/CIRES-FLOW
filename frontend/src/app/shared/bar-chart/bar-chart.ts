import { Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export interface BarChartDatum {
  label: string;
  value: number;
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [],
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.css',
})
export class BarChart implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: BarChartDatum[] = [];

  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.render();
  }

  ngOnChanges(): void {
    if (this.viewReady) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    if (!this.canvasRef) return;

    this.chart?.destroy();

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.data.map((d) => d.label),
        datasets: [
          {
            data: this.data.map((d) => d.value),
            backgroundColor: '#031c2d',
            borderRadius: 4,
            barThickness: 18,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#031c2d',
            padding: 10,
            cornerRadius: 6,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#eceef1' },
            ticks: { color: '#9aa2ad', font: { family: 'Inter' } },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#031c2d', font: { family: 'Inter', weight: 600 } },
          },
        },
      },
    });
  }
}