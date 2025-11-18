import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ChildState {
  selectedChildId: string | null;
}

// Load initial state from localStorage if available
const loadInitialState = (): ChildState => {
  try {
    const savedChildId = localStorage.getItem("selectedChildId");
    return {
      selectedChildId: savedChildId || null,
    };
  } catch (error) {
    console.error("Failed to load selectedChildId from localStorage:", error);
    return {
      selectedChildId: null,
    };
  }
};

const initialState: ChildState = loadInitialState();

const childSlice = createSlice({
  name: "child",
  initialState,
  reducers: {
    setSelectedChild: (state, action: PayloadAction<string>) => {
      state.selectedChildId = action.payload;
      // Persist to localStorage
      try {
        localStorage.setItem("selectedChildId", action.payload);
      } catch (error) {
        console.error("Failed to save selectedChildId to localStorage:", error);
      }
    },
    clearSelectedChild: (state) => {
      state.selectedChildId = null;
      // Clear from localStorage
      try {
        localStorage.removeItem("selectedChildId");
      } catch (error) {
        console.error("Failed to clear selectedChildId from localStorage:", error);
      }
    },
  },
});

export const { setSelectedChild, clearSelectedChild } = childSlice.actions;
export default childSlice.reducer;
