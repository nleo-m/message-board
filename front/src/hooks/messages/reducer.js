export default function messageReducer(state, action) {
  switch (action.type) {
    case "LIST_MESSAGES":
      return {
        ...state,
        messages: action.payload,
      };
    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [action.payload, ...state.messages],
      };

    case "EDIT_MESSAGE":
      const updatedMessage = state.messages.map((message) => {
        if (message.id === action.payload.id) {
          return action.payload;
        }

        return message;
      });

      return {
        ...state,
        messages: updatedMessage,
      };

    case "DELETE_MESSAGE":
      return {
        ...state,
        messages: state.messages.filter(
          (message) => message.id !== action.payload
        ),
      };

    default:
      return state;
  }
}
