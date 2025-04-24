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

const UploadSection = styled.div`
  margin-bottom: 20px;
`;

const PuzzleSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  margin-top: 20px;
  position: relative;
`;

const PuzzlePiece = styled.div<{ isCorrect: boolean }>`
  width: 100px;
  height: 100px;
  border: 2px solid ${props => props.isCorrect ? 'green' : 'gray'};
  cursor: move;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
`;

const CorrectPosition = styled.div`
  width: 100px;
  height: 100px;
  border: 2px dashed #ccc;
  position: absolute;
  z-index: 1;
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
        style={{
          transform: `translate(${piece.correctPosition.x}px, ${piece.correctPosition.y}px)`
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

        newPieces.push({
          id: i,
          image: pieceCanvas.toDataURL(),
          correctPosition: { x, y },
          currentPosition: { x: Math.random() * 500, y: Math.random() * 500 }
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
      if (piece) {
        piece.currentPosition = position;
        
        // 正解位置との距離をチェック
        const distance = Math.sqrt(
          Math.pow(piece.currentPosition.x - piece.correctPosition.x, 2) +
          Math.pow(piece.currentPosition.y - piece.correctPosition.y, 2)
        );

        if (distance < 20) {
          piece.currentPosition = piece.correctPosition;
        }
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

        <PuzzleSection>
          {pieces.map(piece => (
            <React.Fragment key={piece.id}>
              <CorrectPosition
                style={{
                  transform: `translate(${piece.correctPosition.x}px, ${piece.correctPosition.y}px)`
                }}
              />
              <DraggablePuzzlePiece
                piece={piece}
                movePiece={movePiece}
              />
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
