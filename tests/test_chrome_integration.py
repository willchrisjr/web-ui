import sys
sys.path.append(".")

from dotenv import load_dotenv
load_dotenv()

import asyncio
import os
from pprint import pprint

# Import from src instead of browser_use
from src.utils import utils
from src.agent.custom_agent import CustomAgent
from src.agent.custom_prompts import CustomSystemPrompt, CustomAgentMessagePrompt
from src.browser.custom_browser import CustomBrowser
from src.browser.custom_context import BrowserContextConfig
from src.controller.custom_controller import CustomController
from src.agent.custom_views import AgentHistoryList

# We need to install browser-use package for these imports
import browser_use
from browser_use.browser.context import BrowserContextWindowSize
from browser_use.browser.browser import BrowserConfig


async def test_chrome_integration():
    """Test the integration with an existing Chrome instance using CDP."""
    window_w, window_h = 1280, 1100
    
    # Use Google's Gemini model
    llm = utils.get_llm_model(
        provider="google",
        model_name="gemini-2.0-flash",
        temperature=0.6,
        api_key=os.getenv("GOOGLE_API_KEY", "")
    )
    
    controller = CustomController()
    use_own_browser = True
    disable_security = True
    use_vision = False
    max_actions_per_step = 1
    browser = None
    browser_context = None
    
    try:
        # Configure to use existing Chrome instance
        chrome_cdp = os.getenv("CHROME_CDP", "http://localhost:9222")
        print(f"Connecting to Chrome at: {chrome_cdp}")
        
        browser = CustomBrowser(
            config=BrowserConfig(
                headless=False,
                disable_security=disable_security,
                cdp_url=chrome_cdp,  # Use CDP to connect to existing Chrome
            )
        )
        
        browser_context = await browser.new_context(
            config=BrowserContextConfig(
                trace_path="./tmp/traces",
                save_recording_path="./tmp/record_videos",
                no_viewport=False,
                browser_window_size=BrowserContextWindowSize(
                    width=window_w, height=window_h
                ),
            )
        )
        
        # Create a simple task to test the integration
        agent = CustomAgent(
            task="Go to weather.com and tell me the current weather for San Francisco",
            add_infos="",
            llm=llm,
            browser=browser,
            browser_context=browser_context,
            controller=controller,
            system_prompt_class=CustomSystemPrompt,
            agent_prompt_class=CustomAgentMessagePrompt,
            use_vision=use_vision,
            max_actions_per_step=max_actions_per_step,
            generate_gif=True
        )
        
        print("Running agent...")
        history: AgentHistoryList = await agent.run(max_steps=10)
        
        print("\nFinal Result:")
        pprint(history.final_result(), indent=4)
        
        print("\nErrors:")
        pprint(history.errors(), indent=4)
        
        print("\nModel Outputs:")
        pprint(history.model_actions(), indent=4)
        
        print("\nThoughts:")
        pprint(history.model_thoughts(), indent=4)
        
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()
    finally:
        if browser_context:
            await browser_context.close()
        if browser:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(test_chrome_integration())