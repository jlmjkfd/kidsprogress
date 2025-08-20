import { configureStore } from "@reduxjs/toolkit";
import messagesReducer from "./modules/messagesSlice";
import writingsReducer from "./modules/writingSlice";

const store = configureStore({
  reducer: {
    messages: messagesReducer,
    writings: writingsReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
