import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "./modules/chatSlice";
import writingsReducer from "./modules/writingSlice";

const store = configureStore({
  reducer: {
    messages: chatReducer,
    writings: writingsReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
