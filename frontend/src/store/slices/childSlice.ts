import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ChildState {
  selectedChildId: string | null;
}

const initialState: ChildState = {
  selectedChildId: null,
};

const childSlice = createSlice({
  name: "child",
  initialState,
  reducers: {
    setSelectedChild: (state, action: PayloadAction<string>) => {
      state.selectedChildId = action.payload;
    },
    clearSelectedChild: (state) => {
      state.selectedChildId = null;
    },
  },
});

export const { setSelectedChild, clearSelectedChild } = childSlice.actions;
export default childSlice.reducer;
