import React, { useState, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Version = styled.div`
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 14px;
`;

const UploadSection = styled.div`
  margin-bottom: 20px;
`;

const PuzzleSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0;
  margin-top: 20px;
  position: relative;
  width: fit-content;
  margin: 20px auto;
  border: 1px solid #ccc;
`;

const PuzzlePiece = styled.div<{ isCorrect: boolean }>`
  width: 100px;
  height: 100px;
  border: 1px solid ${props => props.isCorrect ? 'green' : 'gray'};
  cursor: move;
  transition: all 0.3s ease;
  position: absolute;
  z-index: 2;
  background-size: cover;
  background-position: center;
`;

const CorrectPosition = styled.div<{ isFilled: boolean }>`
  width: 100px;
  height: 100px;
  border: ${props => props.isFilled ? 'none' : '1px dashed #ccc'};
  position: absolute;
  z-index: 1;
  background: ${props => props.isFilled ? 'none' : 'rgba(255, 255, 255, 0.1)'};
  pointer-events: none;
`;

const Controls = styled.div`
  margin: 20px 0;
  display: flex;
  gap: 10px;
  align-items: center;
`;

const Celebration = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 48px;
  color: white;
  animation: celebrate 2s ease-in-out;
  
  @keyframes celebrate {
    0% { transform: scale(0); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
`;

interface PuzzlePieceData {
  id: number;
  image: string;
  correctPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
}

interface PuzzlePieceProps {
  piece: PuzzlePieceData;
  movePiece: (id: number, position: { x: number; y: number }) => void;
}

const DraggablePuzzlePiece: React.FC<PuzzlePieceProps> = ({ piece, movePiece }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'PUZZLE_PIECE',
    item: { id: piece.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [, drop] = useDrop(() => ({
    accept: 'PUZZLE_PIECE',
    drop: (item: { id: number }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        const x = Math.round(piece.currentPosition.x + delta.x);
        const y = Math.round(piece.currentPosition.y + delta.y);
        movePiece(piece.id, { x, y });
      }
    },
  }));

  return (
    <React.Fragment>
      <CorrectPosition
        isFilled={piece.currentPosition.x === piece.correctPosition.x && 
                 piece.currentPosition.y === piece.correctPosition.y}
        style={{
          transform: `translate(${piece.correctPosition.x}px, ${piece.correctPosition.y}px)`,
          backgroundImage: piece.currentPosition.x === piece.correctPosition.x && 
                         piece.currentPosition.y === piece.correctPosition.y ? 
                         `url(${piece.image})` : 'none'
        }}
      />
      <PuzzlePiece
        ref={(node: HTMLDivElement | null) => {
          drag(node);
          drop(node);
        }}
        isCorrect={piece.currentPosition.x === piece.correctPosition.x && piece.currentPosition.y === piece.correctPosition.y}
        style={{
          backgroundImage: `url(${piece.image})`,
          backgroundSize: 'cover',
          transform: `translate(${piece.currentPosition.x}px, ${piece.currentPosition.y}px)`,
          opacity: isDragging ? 0.5 : 1,
        }}
      />
    </React.Fragment>
  );
};

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
  const [pieces, setPieces] = useState<PuzzlePieceData[]>([]);
  const [numPieces, setNumPieces] = useState(9);
  const [isComplete, setIsComplete] = useState(false);
  const [showOriginalImage, setShowOriginalImage] = useState(true);

  const onImageLoad = (crop: Crop, percentageCrop: Crop) => {
    setCrop({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const createPuzzle = () => {
    if (!image) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = image;
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      canvas.width = size;
      canvas.height = size;

      // 画像を正方形にトリミング
      ctx.drawImage(img, 0, 0, size, size);

      const pieceSize = size / Math.sqrt(numPieces);
      const newPieces: PuzzlePieceData[] = [];

      for (let i = 0; i < numPieces; i++) {
        const x = (i % Math.sqrt(numPieces)) * pieceSize;
        const y = Math.floor(i / Math.sqrt(numPieces)) * pieceSize;

        const pieceCanvas = document.createElement('canvas');
        pieceCanvas.width = pieceSize;
        pieceCanvas.height = pieceSize;
        const pieceCtx = pieceCanvas.getContext('2d');
        if (!pieceCtx) return;

        pieceCtx.drawImage(canvas, x, y, pieceSize, pieceSize, 0, 0, pieceSize, pieceSize);

        // 初期位置を正解位置の近くに設定（±100pxの範囲）
        const offsetX = (Math.random() - 0.5) * 200;
        const offsetY = (Math.random() - 0.5) * 200;

        newPieces.push({
          id: i,
          image: pieceCanvas.toDataURL(),
          correctPosition: { x, y },
          currentPosition: { 
            x: x + offsetX, 
            y: y + offsetY 
          }
        });
      }

      setPieces(newPieces);
      setShowOriginalImage(false);
    };
  };

  const movePiece = (id: number, position: { x: number; y: number }) => {
    setPieces(prevPieces => {
      const newPieces = [...prevPieces];
      const piece = newPieces.find(p => p.id === id);
      if (!piece) return newPieces;

      // 他のピースと重なっているかチェック
      const isOverlapping = newPieces.some(p => 
        p.id !== id && 
        Math.abs(p.currentPosition.x - position.x) < 50 && 
        Math.abs(p.currentPosition.y - position.y) < 50
      );

      if (isOverlapping) return newPieces;

      // 正解位置との距離をチェック
      const distance = Math.sqrt(
        Math.pow(position.x - piece.correctPosition.x, 2) +
        Math.pow(position.y - piece.correctPosition.y, 2)
      );

      // 正解位置との距離が30px以内の場合
      if (distance < 30) {
        // 正解位置に他のピースがいるかチェック
        const isCorrectPositionOccupied = newPieces.some(p => 
          p.id !== id && 
          p.currentPosition.x === piece.correctPosition.x && 
          p.currentPosition.y === piece.correctPosition.y
        );

        if (!isCorrectPositionOccupied) {
          piece.currentPosition = piece.correctPosition;
        } else {
          piece.currentPosition = position;
        }
      } else {
        piece.currentPosition = position;
      }

      // すべてのピースが正しい位置にあるかチェック
      const isComplete = newPieces.every(piece => 
        piece.currentPosition.x === piece.correctPosition.x &&
        piece.currentPosition.y === piece.correctPosition.y
      );
      setIsComplete(isComplete);

      return newPieces;
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Container>
        <Version>v0.1.4</Version>
        <h1>ジグソーパズル</h1>
        
        <UploadSection>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        </UploadSection>

        {image && showOriginalImage && (
          <>
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={onImageLoad}
            >
              <img src={image} alt="Uploaded" />
            </ReactCrop>

            <Controls>
              <select value={numPieces} onChange={e => setNumPieces(Number(e.target.value))}>
                {[6, 9, 12, 16, 20].map(num => (
                  <option key={num} value={num}>{num}ピース</option>
                ))}
              </select>
              <button onClick={createPuzzle}>パズル作成</button>
            </Controls>
          </>
        )}

        <PuzzleSection style={{ 
          width: `${Math.sqrt(numPieces) * 100}px`,
          height: `${Math.sqrt(numPieces) * 100}px`
        }}>
          {pieces.map(piece => (
            <React.Fragment key={piece.id}>
              <CorrectPosition
                isFilled={piece.currentPosition.x === piece.correctPosition.x && 
                         piece.currentPosition.y === piece.correctPosition.y}
                style={{
                  transform: `translate(${piece.correctPosition.x}px, ${piece.correctPosition.y}px)`,
                  backgroundImage: piece.currentPosition.x === piece.correctPosition.x && 
                                 piece.currentPosition.y === piece.correctPosition.y ? 
                                 `url(${piece.image})` : 'none'
                }}
              />
              {piece.currentPosition.x !== piece.correctPosition.x || 
               piece.currentPosition.y !== piece.correctPosition.y ? (
                <DraggablePuzzlePiece
                  piece={piece}
                  movePiece={movePiece}
                />
              ) : null}
            </React.Fragment>
          ))}
        </PuzzleSection>

        {isComplete && (
          <Celebration>
            おめでとうございます！
          </Celebration>
        )}
      </Container>
    </DndProvider>
  );
}

export default App;
