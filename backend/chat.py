import os
import google.generativeai as genai
from sqlalchemy.orm import Session
import models

def generate_chat_response(message: str, db: Session, history: list = None) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "Error: GEMINI_API_KEY is not set in the `.env` file. Please add it to use the AI chatbot."
        
    genai.configure(api_key=api_key)
    
    def get_bus_status(bus_id: str = None) -> str:
        """
        Gets the current location and status of a bus or all buses.
        Args:
            bus_id: The ID of the bus (e.g. 'BUS-101', 'BUS-201'). If None, returns status of all buses.
        """
        query = db.query(models.Bus)
        if bus_id:
            # Make case insensitive search just in case
            query = query.filter(models.Bus.id.ilike(f"%{bus_id}%"))
        buses = query.all()
        
        if not buses:
            return f"No buses found matching ID '{bus_id}'."
            
        results = []
        for bus in buses:
            # Get latest location for this bus
            latest_loc = db.query(models.Location).filter(models.Location.bus_id == bus.id).order_by(models.Location.timestamp.desc()).first()
            if latest_loc:
                results.append(f"{bus.id} (Route {bus.route_id}): Status is {bus.status}. Speed: {latest_loc.speed or 0} km/h. Coordinates: ({latest_loc.latitude}, {latest_loc.longitude}). Last updated: {latest_loc.timestamp.strftime('%H:%M:%S')}.")
            else:
                results.append(f"{bus.id} (Route {bus.route_id}): Status is {bus.status}. Simulated Route progress: {round(bus.progress * 100, 1)}%. No live GPS data available right now.")
                
        return "\n".join(results)

    model = genai.GenerativeModel(
        model_name='gemini-3.6-flash',
        tools=[get_bus_status],
        system_instruction="You are CampusTrack AI, a helpful and friendly assistant for college students. You help them find their buses. Always use the get_bus_status tool when asked about a bus's location, status, or ETA. Keep your responses concise and natural. Do not list raw coordinates to the user, instead describe where it might be or just give the status/speed."
    )
    
    # Format history for Gemini
    formatted_history = []
    if history:
        for msg in history:
            # Skip empty messages or messages that might break the API
            if not msg.get("content"): continue
            role = "user" if msg["role"] == "user" else "model"
            formatted_history.append({"role": role, "parts": [msg["content"]]})
            
    # Enable automatic function calling so Gemini handles the tool loop natively
    chat = model.start_chat(history=formatted_history, enable_automatic_function_calling=True)
    
    try:
        response = chat.send_message(message)
        return response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "I'm sorry, I'm having trouble retrieving that information right now. Please try again in a moment."
