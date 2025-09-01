import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { Message, WritingPayload_User, MathPayload_User } from "../../models/Message";
import { MessageStatus } from "../../utils/messageUtils";
import { ChatRole, ChatType, ChatFormType } from "../../utils/constants";
import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Type guard to check if payload is a user payload
function isUserPayload(payload: unknown): payload is UserPayload {
  // Check for WritingPayload_User
  if (typeof payload === 'object' && payload !== null) {
    if ('title' in payload && 'text' in payload) {
      return typeof (payload as Record<string, unknown>).title === 'string' && 
             typeof (payload as Record<string, unknown>).text === 'string';
    }
    // Check for MathPayload_User  
    if ('problemType' in payload || 'difficulty' in payload) {
      const p = payload as Record<string, unknown>;
      return (!p.problemType || typeof p.problemType === 'string') &&
             (!p.difficulty || typeof p.difficulty === 'string');
    }
  }
  return false;
}

interface ChatState {
  messages: Message[];
  hasMore: boolean;
  loading: boolean;
}

interface SendMessagePayload {
  tempId: string;
  message: Message;
}

interface UpdateMessagePayload {
  tempId: string;
  updates: Partial<Message>;
}

type UserPayload = WritingPayload_User | MathPayload_User;

interface SendMessageRequest {
  tempId: string;
  role: ChatRole;
  content: string;
  type: ChatType;
  formType?: ChatFormType;
  payload?: UserPayload;
}

interface SendMessageResponse {
  tempId: string;
  userMsgId: string;
  AIMsgId: string;
  AIMsg: Message;
}

interface SendMessageError {
  tempId: string;
  error: string;
}

interface FetchParams {
  limit: number;
  beforeId?: string;
}

const initialState: ChatState = {
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

// Async thunk for sending messages with temp ID support
const sendMessage = createAsyncThunk<
  { tempId: string; response: SendMessageResponse },
  SendMessagePayload,
  { rejectValue: SendMessageError }
>(
  "chat/sendMessage", 
  async (payload: SendMessagePayload, { rejectWithValue }) => {
    try {
      const { tempId, message } = payload;
      
      // Build request payload safely
      const requestPayload: SendMessageRequest = {
        tempId,
        role: message.role,
        content: message.content,
        type: message.type,
      };

      // Add optional fields only if they exist and are of correct type
      if ('formType' in message && message.formType) {
        requestPayload.formType = message.formType;
      }
      
      if ('payload' in message && message.payload && isUserPayload(message.payload)) {
        requestPayload.payload = message.payload;
      }

      // Send message to server with temp ID
      const response = await axios.post(`${apiBaseUrl}/chat`, requestPayload);

      return {
        tempId,
        response: response.data as SendMessageResponse
      };
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.detail || error.message 
        : 'Failed to send message';
        
      return rejectWithValue({
        tempId: payload.tempId,
        error: errorMessage
      });
    }
  }
);

const chatSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    // Add message with optimistic UI support
    addMessage(state, action: PayloadAction<Message>) {
      state.messages = [...state.messages, action.payload];
    },
    
    // Update message by temp ID
    updateMessageByTempId(state, action: PayloadAction<UpdateMessagePayload>) {
      const { tempId, updates } = action.payload;
      const messageIndex = state.messages.findIndex(msg => 
        msg.tempId === tempId || msg._id === tempId
      );
      
      if (messageIndex !== -1) {
        // Safe update - only update properties that exist on the message type
        const currentMessage = state.messages[messageIndex];
        state.messages[messageIndex] = { 
          ...currentMessage, 
          ...updates,
          // Ensure type consistency
          tempId: updates.tempId || currentMessage.tempId,
          _id: updates._id || currentMessage._id,
          status: updates.status || currentMessage.status,
          error: updates.error || currentMessage.error,
          retryable: updates.retryable !== undefined ? updates.retryable : currentMessage.retryable
        } as Message;
      }
    },
    
    // Remove message by temp ID (for retry scenarios)
    removeMessageByTempId(state, action: PayloadAction<string>) {
      const tempId = action.payload;
      state.messages = state.messages.filter(msg => 
        msg.tempId !== tempId && msg._id !== tempId
      );
    },
    
    // Legacy method for backward compatibility
    pushMessage(state, action: PayloadAction<Message>) {
      state.messages = [...state.messages, action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch messages handlers
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
      })
      // Send message handlers
      .addCase(sendMessage.pending, (state, action) => {
        // Update message status to sending
        const tempId = action.meta.arg.tempId;
        const messageIndex = state.messages.findIndex(msg => msg.tempId === tempId);
        if (messageIndex !== -1) {
          state.messages[messageIndex].status = MessageStatus.SENDING;
        }
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { tempId, response } = action.payload;
        const messageIndex = state.messages.findIndex(msg => msg.tempId === tempId);
        
        if (messageIndex !== -1) {
          // Update user message with database ID and sent status
          state.messages[messageIndex] = {
            ...state.messages[messageIndex],
            _id: response.userMsgId,
            status: MessageStatus.SENT,
            error: undefined
          };
          
          // Add AI response message
          if (response.AIMsg) {
            state.messages.push(response.AIMsg);
          }
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        // Update message status to failed
        const tempId = action.meta.arg.tempId;
        const messageIndex = state.messages.findIndex(msg => msg.tempId === tempId);
        
        if (messageIndex !== -1) {
          const currentMessage = state.messages[messageIndex];
          state.messages[messageIndex] = {
            ...currentMessage,
            status: MessageStatus.FAILED,
            error: action.payload?.error || 'Failed to send message',
            retryable: true
          } as Message;
        }
      });
  },
});

const chatReducer = chatSlice.reducer;

export default chatReducer;
export const { 
  addMessage, 
  updateMessageByTempId, 
  removeMessageByTempId, 
  pushMessage  // Legacy export for backward compatibility
} = chatSlice.actions;
export { fetchMessages, sendMessage };
