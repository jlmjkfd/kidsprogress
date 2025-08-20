import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Writing, WritingPreview } from "../../models/Writing";
import { RootState } from "..";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface WritingState {
  writings: WritingPreview[];
  loading: boolean;
  //   selected?: Writing;
  viewMode: "grid" | "list";
  detail: Record<string, Writing>;
}

const initialState: WritingState = {
  writings: [],
  loading: false,
  viewMode: "grid",
  detail: {},
};

const fetchWritings = createAsyncThunk<WritingPreview[]>(
  "writing/fetchAll",
  async () => {
    const res = await fetch(`${apiBaseUrl}/writings`);
    if (!res.ok) {
      throw new Error("Failed to fetch writings");
    }
    return (await res.json()) as WritingPreview[];
  }
);

const fetchWritingById = createAsyncThunk<Writing, string>(
  "writing/fetchById",
  async (id: string) => {
    const res = await fetch(`${apiBaseUrl}/writings/${id}`);
    if (!res.ok) {
      throw new Error("Failed to fetch writings");
    }
    return (await res.json()) as Writing;
  }
);

const writingSlice = createSlice({
  name: "writings",
  initialState,
  reducers: {
    pushWriting(state, action: PayloadAction<Writing>) {
      state.writings = [...state.writings, action.payload];
    },
    setViewMode(state, action: PayloadAction<"grid" | "list">) {
      state.viewMode = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWritings.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchWritings.fulfilled,
        (state, action: PayloadAction<WritingPreview[]>) => {
          state.loading = false;
          state.writings = action.payload;
        }
      )
      .addCase(fetchWritings.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchWritingById.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchWritingById.fulfilled,
        (state, action: PayloadAction<Writing>) => {
          state.loading = false;
          state.detail[action.payload._id] = action.payload;
        }
      )
      .addCase(fetchWritingById.rejected, (state) => {
        state.loading = false;
      });
  },
});

const writingsReducer = writingSlice.reducer;

export { fetchWritings, fetchWritingById };
export const { pushWriting, setViewMode, setLoading } = writingSlice.actions;

export const selectWritings = (state: RootState) => state.writings.writings;
export const selectWritingDetail = (id?: string) => (state: RootState) =>
  id ? state.writings.detail[id] : undefined;
export const selectWritingLoading = (state: RootState) =>
  state.writings.loading;
export const selectWritingViewMode = (state: RootState) =>
  state.writings.viewMode;

export default writingsReducer;
