class ChartAnnotations {
    constructor(chartRenderer) {
        this.chart = chartRenderer;
        this.annotations = [];
    }

    addTradeSignal(signal, optionsStrategy) {
        this.clearAnnotations();
        
        const currentPrice = signal.currentPrice;
        const entry = signal.entry;
        const stopLoss = signal.stopLoss;
        const targets = signal.targets;
        
        // Add price levels
        this.addHorizontalLine(entry, '#00ff88', 'ENTRY: ₹' + entry, 2);
        this.addHorizontalLine(stopLoss, '#ff4757', 'STOP LOSS: ₹' + stopLoss, 2);
        targets.forEach((target, index) => {
            this.addHorizontalLine(target, '#00e676', `T${index + 1}: ₹${target}`, 1);
        });
        
        // Add signal arrow
        this.addSignalArrow(signal);
        
        // Add options recommendation box
        if (optionsStrategy) {
            this.addOptionsBox(optionsStrategy);
        }
        
        this.redraw();
    }

    addHorizontalLine(price, color, label, width = 1) {
        this.annotations.push({
            type: 'horizontal_line',
            price: price,
            color: color,
            label: label,
            width: width
        });
    }

    addSignalArrow(signal) {
        const direction = signal.signal === 'BUY' ? 'up' : signal.signal === 'SELL' ? 'down' : 'right';
        this.annotations.push({
            type: 'signal_arrow',
            price: signal.currentPrice,
            direction: direction,
            color: signal.signal === 'BUY' ? '#00ff88' : signal.signal === 'SELL' ? '#ff4757' : '#ffd700',
            confidence: signal.confidence
        });
    }

    addOptionsBox(strategy) {
        this.annotations.push({
            type: 'options_box',
            strategy: strategy,
            x: 50,
            y: 50
        });
    }

    redraw() {
        // Clear existing annotations
        this.chart.render();
        
        // Draw all annotations
        this.annotations.forEach(annotation => {
            switch (annotation.type) {
                case 'horizontal_line':
                    this.drawHorizontalLine(annotation);
                    break;
                case 'signal_arrow':
                    this.drawSignalArrow(annotation);
                    break;
                case 'options_box':
                    this.drawOptionsBox(annotation);
                    break;
            }
        });
    }

    drawHorizontalLine(annotation) {
        const ctx = this.chart.ctx;
        const y = this.chart.priceToY(annotation.price);
        
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.width;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(this.chart.padding.left, y);
        ctx.lineTo(this.chart.padding.left + this.chart.chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw label
        ctx.fillStyle = annotation.color;
        ctx.font = '12px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(annotation.label, this.chart.padding.left + 10, y - 5);
    }

    drawSignalArrow(annotation) {
        const ctx = this.chart.ctx;
        const y = this.chart.priceToY(annotation.price);
        const x = this.chart.padding.left + this.chart.chartWidth - 100;
        
        ctx.fillStyle = annotation.color;
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = 2;
        
        // Draw arrow based on direction
        if (annotation.direction === 'up') {
            this.drawUpArrow(ctx, x, y);
        } else if (annotation.direction === 'down') {
            this.drawDownArrow(ctx, x, y);
        }
        
        // Draw confidence badge
        ctx.fillStyle = '#1a1f2e';
        ctx.fillRect(x + 20, y - 15, 60, 20);
        ctx.fillStyle = annotation.color;
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`${annotation.confidence}%`, x + 50, y - 2);
    }

    drawUpArrow(ctx, x, y) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8, y + 15);
        ctx.lineTo(x + 8, y + 15);
        ctx.closePath();
        ctx.fill();
    }

    drawDownArrow(ctx, x, y) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8, y - 15);
        ctx.lineTo(x + 8, y - 15);
        ctx.closePath();
        ctx.fill();
    }

    drawOptionsBox(annotation) {
        const ctx = this.chart.ctx;
        const strategy = annotation.strategy;
        
        const boxWidth = 280;
        const boxHeight = 120;
        
        // Draw box background
        ctx.fillStyle = 'rgba(26, 29, 58, 0.95)';
        ctx.fillRect(annotation.x, annotation.y, boxWidth, boxHeight);
        
        // Draw border
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.strokeRect(annotation.x, annotation.y, boxWidth, boxHeight);
        
        // Draw content
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`Options Strategy: ${strategy.name}`, annotation.x + 10, annotation.y + 20);
        
        if (strategy.legs && strategy.legs.length > 0) {
            const leg = strategy.legs[0];
            ctx.font = '12px Inter';
            ctx.fillText(`${leg.action} ${leg.option} ${leg.strike}`, annotation.x + 10, annotation.y + 40);
            ctx.fillText(`Premium: ₹${leg.premium}`, annotation.x + 10, annotation.y + 55);
            ctx.fillText(`Max Loss: ₹${leg.maxLoss}`, annotation.x + 10, annotation.y + 70);
            ctx.fillText(`Breakeven: ₹${leg.breakeven}`, annotation.x + 10, annotation.y + 85);
        }
    }

    clearAnnotations() {
        this.annotations = [];
    }
}