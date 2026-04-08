import { useEffect, useRef } from 'react';

type SignaturePadProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const SignaturePad: React.FC<SignaturePadProps> = ({ label, value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRenderedValueRef = useRef('');

  const redraw = (nextValue: string) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 320;
    const height = 170;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#19325d';

    if (!nextValue) {
      lastRenderedValueRef.current = '';
      return;
    }

    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, width, height);
      lastRenderedValueRef.current = nextValue;
    };
    image.src = nextValue;
  };

  useEffect(() => {
    redraw(value);

    const handleResize = () => {
      redraw(lastRenderedValueRef.current || value);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (drawingRef.current) {
      return;
    }

    if (value === lastRenderedValueRef.current) {
      return;
    }

    redraw(value);
  }, [value]);

  const relativePosition = (event: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);

    const point = relativePosition(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    const point = relativePosition(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    onChange(canvas.toDataURL('image/png'));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    drawingRef.current = false;
    lastRenderedValueRef.current = canvas?.toDataURL('image/png') ?? '';
    onChange(lastRenderedValueRef.current);

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const clear = () => {
    onChange('');
  };

  return (
    <div className="zt-signature-pad">
      <div className="zt-signature-pad__header">
        <strong>{label}</strong>
        <button type="button" className="zt-signature-pad__clear" onClick={clear}>
          Limpar
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="zt-signature-pad__canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
};

export default SignaturePad;
