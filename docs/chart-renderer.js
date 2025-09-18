class ChartRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        this.padding = { top: 20, right: 60, bottom: 40, left: 60 };
    }

    setData(data) {
        this.data = data.slice(-50); // Show last 50 candles
        this.render();
    }

    render() {
        this.clearCanvas();
        if (this.data.length === 0) return;

        this.calculateDimensions();
        this.drawGrid();
        this.drawCandles();
        this.drawPriceAxis();
        this.drawTimeAxis();
        this.drawCrosshair();
    }

    clearCanvas() {
        this.ctx.fillStyle = '#252a3a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    calculateDimensions() {
        this.chartWidth = this.canvas.width - this.padding.left - this.padding.right;
        this.chartHeight = this.canvas.height - this.padding.top - this.padding.bottom;
        
        const prices = this.data.flatMap(d => [d.high, d.low]);
        this.minPrice = Math.min(...prices) * 0.999;
        this.maxPrice = Math.max(...prices) * 1.001;
        this.priceRange = this.maxPrice - this.minPrice;
        
        this.candleWidth = this.chartWidth / this.data.length * 0.8;
        this.candleSpacing = this.chartWidth / this.data.length;
    }

    drawGrid() {
        this.ctx.strokeStyle = '#34384a';
        this.ctx.lineWidth = 1;

        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = this.padding.top + (this.chartHeight / 5) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding.left, y);
            this.ctx.lineTo(this.padding.left + this.chartWidth, y);
            this.ctx.stroke();
        }

        // Vertical grid lines
        const timeStep = Math.floor(this.data.length / 6);
        for (let i = 0; i < this.data.length; i += timeStep) {
            const x = this.padding.left + this.candleSpacing * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.padding.top);
            this.ctx.lineTo(x, this.padding.top + this.chartHeight);
            this.ctx.stroke();
        }
    }

    drawCandles() {
        this.data.forEach((candle, index) => {
            const x = this.padding.left + (this.candleSpacing * index);
            const isGreen = candle.close >= candle.open;
            
            // Calculate positions
            const openY = this.priceToY(candle.open);
            const closeY = this.priceToY(candle.close);
            const highY = this.priceToY(candle.high);
            const lowY = this.priceToY(candle.low);
            
            // Draw wick
            this.ctx.strokeStyle = isGreen ? '#00ff88' : '#ff4757';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x + this.candleWidth / 2, highY);
            this.ctx.lineTo(x + this.candleWidth / 2, lowY);
            this.ctx.stroke();
            
            // Draw body
            this.ctx.fillStyle = isGreen ? '#00ff88' : '#ff4757';
            const bodyHeight = Math.abs(closeY - openY);
            const bodyY = Math.min(openY, closeY);
            
            if (bodyHeight < 2) {
                // Doji - draw line
                this.ctx.fillRect(x, bodyY, this.candleWidth, 2);
            } else {
                this.ctx.fillRect(x, bodyY, this.candleWidth, bodyHeight);
            }
        });
    }

    drawPriceAxis() {
        this.ctx.fillStyle = '#a4a6b3';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'left';
        
        for (let i = 0; i <= 5; i++) {
            const price = this.minPrice + (this.priceRange / 5) * i;
            const y = this.padding.top + this.chartHeight - (this.chartHeight / 5) * i;
            this.ctx.fillText(price.toFixed(2), this.padding.left + this.chartWidth + 5, y + 4);
        }
    }

    drawTimeAxis() {
        this.ctx.fillStyle = '#a4a6b3';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'center';
        
        const timeStep = Math.floor(this.data.length / 4);
        for (let i = 0; i < this.data.length; i += timeStep) {
            if (this.data[i]) {
                const time = new Date(this.data[i].timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const x = this.padding.left + (this.candleSpacing * i);
                this.ctx.fillText(time, x, this.canvas.height - 10);
            }
        }
    }

    drawCrosshair() {
        // Add mouse interaction for crosshair
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.render(); // Re-render without crosshair
            
            if (x > this.padding.left && x < this.padding.left + this.chartWidth &&
                y > this.padding.top && y < this.padding.top + this.chartHeight) {
                
                // Draw crosshair lines
                this.ctx.strokeStyle = '#666';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([5, 5]);
                
                // Vertical line
                this.ctx.beginPath();
                this.ctx.moveTo(x, this.padding.top);
                this.ctx.lineTo(x, this.padding.top + this.chartHeight);
                this.ctx.stroke();
                
                // Horizontal line
                this.ctx.beginPath();
                this.ctx.moveTo(this.padding.left, y);
                this.ctx.lineTo(this.padding.left + this.chartWidth, y);
                this.ctx.stroke();
                
                this.ctx.setLineDash([]);
                
                // Price label
                const price = this.yToPrice(y);
                this.ctx.fillStyle = '#1a1f2e';
                this.ctx.fillRect(this.padding.left + this.chartWidth + 2, y - 10, 60, 20);
                this.ctx.fillStyle = '#00ff88';
                this.ctx.font = '12px Inter';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(price.toFixed(2), this.padding.left + this.chartWidth + 5, y + 4);
            }
        });
    }

    priceToY(price) {
        return this.padding.top + this.chartHeight - 
               ((price - this.minPrice) / this.priceRange) * this.chartHeight;
    }

    yToPrice(y) {
        return this.minPrice + 
               ((this.padding.top + this.chartHeight - y) / this.chartHeight) * this.priceRange;
    }
}