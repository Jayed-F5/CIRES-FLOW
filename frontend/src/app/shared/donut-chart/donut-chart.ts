import { Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [],
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.css',
})
export class DonutChart implements AfterViewInit, OnChanges, OnDestroy {
  @Input() respecte = 0;
  @Input() aRisque = 0;
  @Input() depasse = 0;

  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private viewReady = false;

  get centerLabel(): string {
    const total = this.respecte + this.aRisque + this.depasse;
    if (total === 0) return '—';
    return `${Math.round((this.respecte / total) * 100)}%`;
  }

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
      type: 'doughnut',
      data: {
        labels: ['Respecté', 'À risque', 'Dépassé'],
        datasets: [
          {
            data: [this.respecte, this.aRisque, this.depasse],
            backgroundColor: ['#2ecc71', '#f5a623', '#e74c3c'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#031c2d',
            padding: 10,
            cornerRadius: 6,
          },
        },
      },
    });
  }
}