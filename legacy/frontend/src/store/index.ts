import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import childReducer from "./slices/childSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    child: childReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
