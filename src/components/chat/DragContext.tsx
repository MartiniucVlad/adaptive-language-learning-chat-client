import { createContext, useContext, useState, type ReactNode } from 'react';
import type {StorySummary} from './StoriesPage.tsx';

interface DragContextValue {
    draggedStory: StorySummary | null;
    setDraggedStory: (story: StorySummary | null) => void;
}

const DragContext = createContext<DragContextValue>({
    draggedStory: null,
    setDraggedStory: () => {},
});

export const DragProvider = ({ children }: { children: ReactNode }) => {
    const [draggedStory, setDraggedStory] = useState<StorySummary | null>(null);
    return (
        <DragContext.Provider value={{ draggedStory, setDraggedStory }}>
            {children}
        </DragContext.Provider>
    );
};

export const useDrag = () => useContext(DragContext);