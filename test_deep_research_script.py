import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
import sys

# Add current directory to path
sys.path.append('.')

async def test_deep_research():
    from src.utils.deep_research import deep_research
    from src.utils import utils
    
    task = 'Write a brief report about AI agents and their applications'
    llm = utils.get_llm_model(
        provider='google',
        model_name='gemini-2.5-pro-exp-03-25',
        temperature=0.6,
        api_key=os.getenv('GOOGLE_API_KEY', '')
    )
    
    print('Starting deep research...')
    report_content, report_file_path = await deep_research(
        task=task, 
        llm=llm, 
        agent_state=None, 
        max_search_iterations=1, 
        max_query_num=1,
        use_own_browser=True,
        chrome_cdp='http://localhost:9222'
    )
    print(f'Research completed. Report saved to: {report_file_path}')
    print('\nReport Preview:\n' + '-'*50)
    print(report_content[:500] + '...')

if __name__ == '__main__':
    asyncio.run(test_deep_research())