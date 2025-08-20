import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
// import { ChatRole, ChatType } from "../../utils/constants";
import { Message } from "../../models/Message";
import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface MessagesState {
  messages: Message[];
  hasMore: boolean;
  loading: boolean;
}

interface FetchParams {
  limit: number;
  beforeId?: string;
}

const initialState: MessagesState = {
  messages: [],
  hasMore: true,
  loading: false,
};

const fetchMessages = createAsyncThunk(
  "chat/fetchChats",
  async (beforeId?: string) => {
    const params: FetchParams = { limit: 30 };
    if (beforeId) params.beforeId = beforeId;

    const res = await axios.get<Message[]>(`${apiBaseUrl}/chats`, { params });
    // res.data.forEach((item) => {
    //   if (item.date) {
    //     item.date = new Date(item.date);
    //   }
    // });
    console.log(res);
    return res.data;
  }
);

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    pushMessage(state, action: PayloadAction<Message>) {
      state.messages = [...state.messages, action.payload];
    },
    // loadMoreMessages(state, action: PayloadAction<Message[]>) {
    //   state.messages = [...action.payload, ...state.messages];
    // },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        if (action.meta.arg) {
          // load more
          state.messages = [...action.payload, ...state.messages];
        } else {
          // init
          state.messages = action.payload;
        }

        if (action.payload.length < 30) {
          state.hasMore = false;
        }
      })
      .addCase(fetchMessages.rejected, (state) => {
        state.loading = false;
      });
  },
});

const messagesReducer = messagesSlice.reducer;

export default messagesReducer;
export const { pushMessage } = messagesSlice.actions;
export { fetchMessages };
