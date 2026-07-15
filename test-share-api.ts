async function runTest() {
  const baseUrl = 'http://localhost:3000/api';
  const email = 'testuser@example.com';
  const password = 'Password123!';
  const businessId = 'cmrlvuudl00046lfxw1u90m23';
  const listingId = 'cmrlvuuem00066lfxkdy5jnav';

  console.log('1. Logging in...');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('✅ Login successful! Token acquired.');

  console.log('\n2. Opening conversation with business...');
  const openRes = await fetch(`${baseUrl}/conversations/open`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ targetType: 'BUSINESS', targetId: businessId })
  });

  if (!openRes.ok) {
    console.error('Failed to open conversation:', await openRes.text());
    return;
  }
  
  const conversation = await openRes.json();
  console.log(`✅ Conversation opened! ID: ${conversation.id}`);

  console.log('\n3. Sending a message with a BUSINESS embed snapshot...');
  const sendBusinessRes = await fetch(`${baseUrl}/conversations/${conversation.id}/messages`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content: 'Check out this business!',
      embeds: [{ embedType: 'BUSINESS', targetId: businessId }]
    })
  });

  if (!sendBusinessRes.ok) {
    console.error('Failed to send business embed:', await sendBusinessRes.text());
  } else {
    const businessMsg = await sendBusinessRes.json();
    console.log('✅ Business Embed Message Sent successfully:');
    console.log(JSON.stringify(businessMsg.embeds, null, 2));
  }

  console.log('\n4. Sending a message with a LISTING embed snapshot...');
  const sendListingRes = await fetch(`${baseUrl}/conversations/${conversation.id}/messages`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content: 'Check out this listing!',
      embeds: [{ embedType: 'LISTING', targetId: listingId }]
    })
  });

  if (!sendListingRes.ok) {
    console.error('Failed to send listing embed:', await sendListingRes.text());
  } else {
    const listingMsg = await sendListingRes.json();
    console.log('✅ Listing Embed Message Sent successfully:');
    console.log(JSON.stringify(listingMsg.embeds, null, 2));
  }
}

runTest().catch(console.error);
